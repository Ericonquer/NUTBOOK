// Repair only parsed links surrounded by unescaped literal ** delimiters.
// Markdown code, escaped examples, source bytes, and live editor DOM stay untouched.
export function repairBoldLinks(tree, source) {
  const visit = parent => {
    if (!Array.isArray(parent.children)) return;
    const nodes = parent.children;
    for (let index = 1; index < nodes.length - 1; index++) {
      const before = nodes[index - 1], link = nodes[index], after = nodes[index + 1];
      if (!['link', 'linkReference'].includes(link.type) || before.type !== 'text' || after.type !== 'text') continue;
      const start = link.position?.start?.offset, end = link.position?.end?.offset;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 2) continue;
      if (!before.value.endsWith('**') || !after.value.startsWith('**') || source.slice(start - 2, start) !== '**' || source.slice(end, end + 2) !== '**') continue;
      if (source[start - 3] === '*' || source[end + 2] === '*') continue;
      let escapes = 0;
      for (let offset = start - 3; source[offset] === '\\'; offset--) escapes++;
      if (escapes % 2) continue;
      before.value = before.value.slice(0, -2);
      after.value = after.value.slice(2);
      nodes[index] = { type: 'strong', marker: '*', children: [link], position: {
        start: { ...link.position.start, offset: start - 2, column: link.position.start.column - 2 },
        end: { ...link.position.end, offset: end + 2, column: link.position.end.column + 2 }
      } };
    }
    for (const node of nodes) visit(node);
  };
  visit(tree);
}

// Milkdown serializes strong outside link by mark order. Put the strong inside
// the label instead, so Chinese next to the link cannot invalidate its markers.
export function boldLinkStringifyHandler(fallback) {
  return (node, parent, state, info) => {
    if (node.children?.length && node.children.every(child => child.type === 'link')) {
      return state.containerPhrasing({ ...node, children: node.children.map(link => ({
        ...link, children: [{ ...node, children: link.children }]
      })) }, info);
    }
    return fallback(node, parent, state, info);
  };
}
