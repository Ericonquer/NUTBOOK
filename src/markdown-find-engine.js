// Pure ProseMirror document search helpers. This module deliberately has no
// Milkdown/CSS imports so it can be tested in Node as well as used by the
// editor bundle.

function textSegmentsForBlock(node, blockPos) {
  const segments = [];
  node.descendants((child, pos) => {
    if (child.isText && child.text) {
      // `pos` is relative to the block and points immediately before the text.
      segments.push({ text: child.text, from: blockPos + 1 + pos, to: blockPos + 1 + pos + child.text.length });
      return false;
    }
    // Inline atoms and hard breaks must never create a false contiguous match.
    if (child.isAtom || child.type?.name === "hard_break") {
      segments.push({ boundary: true });
      return false;
    }
    return true;
  });
  return segments;
}

function searchableRuns(doc) {
  const runs = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let run = [];
    for (const segment of textSegmentsForBlock(node, pos)) {
      if (segment.boundary) {
        if (run.length) runs.push(run);
        run = [];
      } else {
        run.push(segment);
      }
    }
    if (run.length) runs.push(run);
    return false;
  });
  return runs;
}

function matchRun(run, query, caseSensitive) {
  const text = run.map((segment) => segment.text).join("");
  const haystack = caseSensitive ? text : text.toLocaleLowerCase();
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const matches = [];
  let start = 0;
  while (needle && start <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, start);
    if (index < 0) break;
    let cursor = 0;
    let from = null;
    let to = null;
    for (const segment of run) {
      const next = cursor + segment.text.length;
      if (from === null && index >= cursor && index < next) from = segment.from + index - cursor;
      const end = index + needle.length;
      if (end > cursor && end <= next) {
        to = segment.from + end - cursor;
        break;
      }
      cursor = next;
    }
    // A match can span adjacent marks but not our block/atom boundaries: runs
    // contain only contiguous editable text, so both endpoints are sufficient.
    if (from !== null && to !== null && from < to) matches.push({ from, to });
    start = index + Math.max(needle.length, 1);
  }
  return matches;
}

export function findDocumentMatches(doc, query, { caseSensitive = false } = {}) {
  const normalized = String(query || "");
  if (!normalized) return [];
  return searchableRuns(doc).flatMap((run) => matchRun(run, normalized, caseSensitive));
}

export function replacementPlan(matches) {
  return [...matches].sort((a, b) => b.from - a.from || b.to - a.to);
}
