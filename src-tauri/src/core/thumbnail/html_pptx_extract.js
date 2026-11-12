(pageId, width, height, originX, originY) => {
  const page = document.querySelector('[data-nutbook-page-id="' + CSS.escape(pageId) + '"]');
  const bounds = node => {
    const rect = node.getBoundingClientRect();
    return new DOMRect(rect.x - originX, rect.y - originY, rect.width, rect.height);
  };
  const visible = node => {
    const style = getComputedStyle(node);
    const rect = bounds(node);
    return style.visibility === "visible" && Number(style.opacity) > 0
      && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0
      && rect.x < width && rect.y < height;
  };
  const markedText = '[data-editable="text"],[data-editable="rich-text"]';
  const blocks = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,td,th,figcaption,blockquote,pre";
  const imageSelector = 'img,[data-editable="image"],[data-editable="background-image"]';
  const unsupported = imageSelector + ",svg,canvas,video,iframe,object,button,input,select,textarea";
  const contentBlocks = blocks + ",div,section,article,ul,ol,dl,table";
  const elements = [...page.querySelectorAll("*")];
  const order = new Map(elements.map((node, index) => [node, index]));
  const state = window.__nutbookPptxCapture = { images: [], texts: [], tables: [], charts: [], highlights: new Set(), boxes: new Set() };
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const colorContext = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  colorContext.canvas.width = colorContext.canvas.height = 1;
  const paint = css => {
    colorContext.clearRect(0, 0, 1, 1);
    colorContext.fillStyle = css;
    colorContext.fillRect(0, 0, 1, 1);
    const rgba = colorContext.getImageData(0, 0, 1, 1).data;
    return {
      rgb: Array.from(rgba.slice(0, 3), channel => channel.toString(16).padStart(2, "0")).join(""),
      alpha: rgba[3]
    };
  };
  const inline = css => /^inline(?:$|-block$)/.test(css.display);
  const readBox = node => {
    const css = getComputedStyle(node);
    if (inline(css) || css.backgroundImage !== "none") return null;
    const fill = paint(css.backgroundColor);
    const edges = ["Top", "Right", "Bottom", "Left"].map(side => [
      css["border" + side + "Style"], css["border" + side + "Width"], css["border" + side + "Color"]
    ]);
    const [lineStyle, lineWidth, lineColor] = edges[0];
    const stroke = lineStyle === "solid" && edges.every(edge => edge.join() === edges[0].join())
      ? { ...paint(lineColor), width: parseFloat(lineWidth) } : null;
    if (!fill.alpha && !stroke?.alpha) return null;
    const rect = bounds(node);
    if (rect.width <= 0 || rect.height <= 0) return null;
    return { node, rect, fill, stroke, radius: parseFloat(css.borderTopLeftRadius) || 0 };
  };
  const boxFor = node => {
    const content = node.textContent.trim();
    for (let box = node; box !== page; box = box.parentElement) {
      if (box.textContent.trim() !== content || box.querySelector(unsupported)) break;
      const style = readBox(box);
      if (style) return style;
    }
    return null;
  };
  const object = (node, x, y, w, h) => ({
    name: node.dataset.id || node.dataset.field || node.getAttribute("aria-label") || node.getAttribute("alt") || "",
    x, y, w, h,
    order: order.get(node),
    z: (() => {
      let ancestor = node;
      while (ancestor && ancestor !== page) {
        const style = getComputedStyle(ancestor);
        if (style.zIndex !== "auto") return Number(style.zIndex) || 0;
        ancestor = ancestor.parentElement;
      }
      return 0;
    })()
  });
  const readText = node => {
    const style = getComputedStyle(node);
    // Use the browser's line breaks, including CJK wrapping and inline emphasis.
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const lines = [];
    const highlighted = new Set();
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!textNode.parentElement.getClientRects().length || getComputedStyle(textNode.parentElement).visibility !== "visible") continue;
      const css = getComputedStyle(textNode.parentElement);
      const backing = [];
      for (let inlineNode = textNode.parentElement; inlineNode !== node.parentElement; inlineNode = inlineNode.parentElement) {
        const style = getComputedStyle(inlineNode);
        if (!inline(style)) continue;
        const fill = paint(style.backgroundColor);
        if (fill.alpha) backing.push({ node: inlineNode, fill });
      }
      const runStyle = {
        font: css.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, ""),
        size: parseFloat(css.fontSize),
        bold: Number(css.fontWeight) >= 600,
        italic: css.fontStyle !== "normal",
        color: paint(css.color).rgb,
        highlight: backing[0]?.fill.alpha === 255 ? backing[0].fill.rgb : null,
        spacing: parseFloat(css.letterSpacing) || 0,
      };
      const key = JSON.stringify(runStyle);
      for (const { segment, index } of segmenter.segment(textNode.data)) {
        range.setStart(textNode, index);
        range.setEnd(textNode, index + segment.length);
        const glyph = bounds(range);
        if (glyph.width <= 0 || glyph.height <= 0) continue;
        backing.forEach(({ node }) => highlighted.add(node));
        const previous = lines.at(-1);
        const mid = glyph.top + glyph.height / 2;
        const line = previous && Math.abs(mid - previous.mid) < glyph.height * 0.52
          ? previous : { mid, top: glyph.top, left: glyph.left, right: glyph.right, runs: [] };
        if (line !== previous) lines.push(line);
        line.left = Math.min(line.left, glyph.left);
        line.right = Math.max(line.right, glyph.right);
        line.top = Math.min(line.top, glyph.top);
        const run = line.runs.at(-1);
        const plain = /[\r\n\t]/.test(segment) ? " " : segment;
        const text = css.textTransform === "uppercase" ? plain.toLocaleUpperCase()
          : css.textTransform === "lowercase" ? plain.toLocaleLowerCase() : plain;
        if (run?.key === key) run.text += text;
        else line.runs.push({ ...runStyle, key, text });
      }
    }
    if (!lines.length) return null;
    const align = style.textAlign.includes("center") ? "ctr" : ["right", "end"].includes(style.textAlign) ? "r" : "l";
    const left = Math.min(...lines.map(line => line.left));
    const right = Math.max(...lines.map(line => line.right));
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const first = lines[0];
    const last = lines.at(-1);
    // Office can wrap text whose substitute font is wider than Chrome's.
    // Leave horizontal room while holding the original alignment anchor.
    const measuredWidth = Math.max(right - left, 1);
    const extra = Math.max(12, measuredWidth * 0.32);
    const x = align === "r" ? left - extra : align === "ctr" ? left - extra / 2 : left;
    const y = first.top;
    return {
      align, x, y, measuredWidth, extra, last, lineHeight, highlighted,
      lines: lines.map((line, index) => ({
        height: (lines[index + 1]?.top ?? (line.top + lineHeight)) - line.top,
        runs: line.runs
      }))
    };
  };

  const cellParagraphs = (cell, scale, compact) => {
    const paragraphs = [];
    const base = getComputedStyle(cell);
    const height = compact ? parseFloat(base.fontSize) * scale * 1.14
      : (parseFloat(base.lineHeight) || parseFloat(base.fontSize) * 1.2);
    let runs = [];
    const end = () => {
      if (!runs.length) return;
      runs[0].text = runs[0].text.replace(/^ +/, "");
      runs.at(-1).text = runs.at(-1).text.replace(/ +$/, "");
      paragraphs.push({ height, runs: runs.filter(run => run.text) });
      runs = [];
    };
    const visit = node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const css = getComputedStyle(node.parentElement);
        let text = node.data.replace(/[\t\r\n\f ]+/g, " ");
        if (css.textTransform === "uppercase") text = text.toLocaleUpperCase();
        if (css.textTransform === "lowercase") text = text.toLocaleLowerCase();
        if (!text || text === " " && !runs.length) return;
        if (runs.at(-1)?.text.endsWith(" ")) text = text.replace(/^ +/, "");
        if (!text) return;
        const run = {
          font: css.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, ""),
          size: parseFloat(css.fontSize) * scale,
          bold: Number(css.fontWeight) >= 600,
          italic: css.fontStyle !== "normal",
          color: paint(css.color).rgb,
          highlight: null,
          spacing: (parseFloat(css.letterSpacing) || 0) * scale
        };
        for (let ancestor = node.parentElement; ancestor !== cell; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          const fill = paint(style.backgroundColor);
          if (inline(style) && fill.alpha === 255) { run.highlight = fill.rgb; break; }
        }
        runs.push({ ...run, text });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || !node.getClientRects().length
          || getComputedStyle(node).visibility !== "visible") return;
      if (node.localName === "br") { end(); return; }
      const block = node !== cell && !inline(getComputedStyle(node));
      if (block) end();
      for (const child of node.childNodes) visit(child);
      if (block) end();
    };
    visit(cell);
    end();
    return paragraphs;
  };

  const cellPadding = (css, compact, sides) => sides.map((side, index) => {
    const padding = parseFloat(css["padding" + side]) || 0;
    return compact ? Math.min(padding, index < 2 ? 5 : 2.5) : padding;
  });
  const fitTable = (node, columns, availableHeight, sides) => {
    // Reflow a detached copy at the final widths. Keep a small font-metric
    // allowance for the difference between Chromium and Office font fallback.
    const clone = node.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    const original = [node, ...node.querySelectorAll("*")];
    const copies = [clone, ...clone.querySelectorAll("*")];
    const metrics = original.map(element => {
      const css = getComputedStyle(element);
      return { size: parseFloat(css.fontSize), padding: element.matches("td,th") ? cellPadding(css, true, sides) : null };
    });
    for (const group of clone.querySelectorAll(":scope > colgroup")) group.remove();
    const colgroup = document.createElement("colgroup");
    for (const width of columns) {
      const col = document.createElement("col");
      col.style.width = width + "px";
      colgroup.append(col);
    }
    clone.prepend(colgroup);
    const tableWidth = columns.reduce((sum, width) => sum + width, 0);
    for (const [property, value] of Object.entries({
      position: "fixed", left: "-20000px", top: "0", width: tableWidth + "px",
      "min-width": "0", height: "auto", "max-height": "none", "table-layout": "fixed",
      "border-spacing": "0", visibility: "hidden"
    })) clone.style.setProperty(property, value, "important");
    node.after(clone);
    try {
      const measure = scale => {
        copies.forEach((element, index) => {
          const { size, padding } = metrics[index];
          element.style.setProperty("font-size", size * scale * 1.05 + "px", "important");
          element.style.setProperty("line-height", "1.15", "important");
          if (padding) {
            for (const [i, side] of sides.entries()) element.style.setProperty("padding-" + side.toLowerCase(), padding[i] + "px", "important");
          }
        });
        return [...clone.rows].map(row => row.getBoundingClientRect().height);
      };
      let low = 0.1;
      let high = 1;
      for (let i = 0; i < 9; i++) {
        const mid = (low + high) / 2;
        const height = measure(mid).reduce((sum, height) => sum + height, 0);
        if (height <= availableHeight) low = mid;
        else high = mid;
      }
      const heights = measure(low);
      const total = heights.reduce((sum, height) => sum + height, 0);
      return { scale: low, heights: heights.map(height => height * availableHeight / total) };
    } finally {
      clone.remove();
    }
  };

  const tableFor = node => {
    const rect = bounds(node);
    const tableStyle = getComputedStyle(node);
    if (!visible(node) || node.closest(unsupported) || node.querySelector(unsupported + ",table")
        || node.caption?.textContent.trim() || tableStyle.direction === "rtl" || tableStyle.backgroundImage !== "none") return null;
    const wrapper = node.parentElement;
    const wrapperRect = bounds(wrapper);
    const wrapperStyle = getComputedStyle(wrapper);
    const dedicatedWrapper = wrapper !== page && wrapper.children.length === 1
      && wrapperStyle.backgroundImage === "none" && wrapper.textContent.trim() === node.textContent.trim();
    const clips = value => /^(auto|scroll|hidden|clip)$/.test(value);
    const frameX = dedicatedWrapper && clips(wrapperStyle.overflowX);
    const frameY = dedicatedWrapper && clips(wrapperStyle.overflowY);
    const left = Math.max(0, frameX ? wrapperRect.left + wrapper.clientLeft : rect.left);
    const top = Math.max(0, frameY ? wrapperRect.top + wrapper.clientTop : rect.top);
    const right = Math.min(width, frameX ? left + wrapper.clientWidth : rect.right);
    const bottom = Math.min(height, frameY ? top + wrapper.clientHeight : rect.bottom);
    const scaleX = Math.min(1, (right - left) / rect.width);
    const scaleY = Math.min(1, (bottom - top) / rect.height);
    if (scaleX <= 0 || scaleY <= 0) return null;
    const fitted = Math.min(scaleX, scaleY) < 0.999;

    const rows = [...node.rows];
    if (!rows.length || rows.length > 100 || rows.some(row => !row.getClientRects().length || getComputedStyle(row).visibility !== "visible")) return null;
    const grid = rows.map(() => []);
    const leftEdges = new Map([[0, rect.left]]);
    const rightEdges = new Map();
    const resolved = [];
    for (const [rowIndex, row] of rows.entries()) {
      let column = 0;
      for (const cell of row.cells) {
        if (!cell.getClientRects().length || getComputedStyle(cell).visibility !== "visible"
            || getComputedStyle(cell).backgroundImage !== "none") return null;
        while (grid[rowIndex][column]) column++;
        const remainingRows = rows.slice(rowIndex).filter(other => other.parentElement === row.parentElement).length;
        const rowSpan = Math.min(cell.rowSpan || remainingRows, remainingRows);
        const colSpan = cell.colSpan;
        if (rowIndex + rowSpan > rows.length || column + colSpan > 100) return null;
        const owner = { cell, rowIndex, column, rowSpan, colSpan };
        for (let y = rowIndex; y < rowIndex + rowSpan; y++) {
          for (let x = column; x < column + colSpan; x++) {
            if (grid[y][x]) return null;
            grid[y][x] = owner;
          }
        }
        const cellRect = bounds(cell);
        if (column > 0) leftEdges.set(column, cellRect.left);
        rightEdges.set(column + colSpan, cellRect.right);
        column += colSpan;
        resolved.push(owner);
      }
    }
    const count = Math.max(...grid.map(row => row.length));
    if (!count || !resolved.length || count * rows.length > 1000) return null;
    const edges = Array.from({ length: count + 1 }, (_, index) => {
      if (!index) return rect.left;
      if (index === count) return rect.right;
      const left = leftEdges.get(index);
      const right = rightEdges.get(index);
      return left != null && right != null ? (left + right) / 2 : left ?? right;
    });
    for (let start = 0; start < count;) {
      let end = start + 1;
      while (edges[end] == null) end++;
      for (let i = start + 1; i < end; i++) edges[i] = edges[start] + (edges[end] - edges[start]) * (i - start) / (end - start);
      start = end;
    }
    const columns = edges.slice(1).map((edge, index) => edge - edges[index]);
    const rowEdges = [rect.top, ...rows.slice(1).map((row, index) =>
      (bounds(rows[index]).bottom + bounds(row).top) / 2), rect.bottom];
    const heights = rowEdges.slice(1).map((edge, index) => edge - rowEdges[index]);
    if ([...columns, ...heights].some(value => value <= 0)) return null;

    // Remove the template's own frame along with the table.
    const tightWrapper = dedicatedWrapper && (frameX || frameY
      || (Math.abs(wrapperRect.width - rect.width) <= 4 && Math.abs(wrapperRect.height - rect.height) <= 4));
    const frame = tightWrapper ? wrapper : node;
    const frameStyle = tightWrapper ? wrapperStyle : tableStyle;
    const sides = ["Left", "Right", "Top", "Bottom"];
    const finalColumns = columns.map(value => value * scaleX);
    const layout = fitted ? fitTable(node, finalColumns, rect.height * scaleY, sides)
      : { scale: 1, heights };
    const strokeFor = (css, side) => {
      const width = parseFloat(css["border" + side + "Width"]);
      return width > 0 ? { ...paint(css["border" + side + "Color"]), width } : null;
    };
    const cells = new Map(resolved.map(({cell, rowIndex, column, rowSpan, colSpan}) => {
      const css = getComputedStyle(cell);
      let fill = paint(css.backgroundColor);
      for (let ancestor = cell.parentElement; !fill.alpha; ancestor = ancestor.parentElement) {
        fill = paint(getComputedStyle(ancestor).backgroundColor);
        if (ancestor === frame) break;
      }
      const outer = [column === 0, column + colSpan === count, rowIndex === 0, rowIndex + rowSpan === rows.length];
      const strokes = sides.map((side, index) => strokeFor(css, side) ?? (outer[index] ? strokeFor(frameStyle, side) : null));
      return [cell, {
        fill, strokes,
        padding: cellPadding(css, fitted, sides),
        anchor: css.verticalAlign === "bottom" ? "b" : css.verticalAlign === "top" ? "t" : "ctr",
        align: css.textAlign.includes("center") ? "ctr" : ["right", "end"].includes(css.textAlign) ? "r" : "l",
        lines: cellParagraphs(cell, layout.scale, fitted)
      }];
    }));
    const matchBorder = (a, aSide, b, bSide) => {
      if (!a || !b || a === b) return;
      const first = cells.get(a.cell).strokes;
      const second = cells.get(b.cell).strokes;
      const stroke = (first[aSide]?.width ?? 0) >= (second[bSide]?.width ?? 0) ? first[aSide] : second[bSide];
      first[aSide] = second[bSide] = stroke;
    };
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < count; x++) {
        matchBorder(grid[y][x], 1, grid[y][x + 1], 0);
        matchBorder(grid[y][x], 3, grid[y + 1]?.[x], 2);
      }
    }
    state.tables.push(frame);
    return {
      ...object(node, left, top, rect.width * scaleX, rect.height * scaleY),
      columns: finalColumns,
      rows: grid.map((row, y) => ({
        height: layout.heights[y],
        cells: Array.from({ length: count }, (_, x) => {
          const owner = row[x];
          if (!owner) return { rowSpan: 1, colSpan: 1, hMerge: false, vMerge: false, content: null };
          const hMerge = x !== owner.column;
          const vMerge = y !== owner.rowIndex;
          return {
            rowSpan: vMerge ? 1 : owner.rowSpan,
            colSpan: hMerge ? 1 : owner.colSpan,
            hMerge, vMerge,
            content: !hMerge && !vMerge ? cells.get(owner.cell) : null
          };
        })
      }))
    };
  };
  const charts = [];
  for (const node of page.querySelectorAll("[data-nutbook-chart]")) {
    if (!visible(node) || node.parentElement.closest("[data-nutbook-chart]")) continue;
    let data;
    try { data = JSON.parse(node.dataset.nutbookChart); } catch { continue; }
    if (!data || !["bar", "line", "pie"].includes(data.kind)
        || (data.title != null && typeof data.title !== "string")
        || !Array.isArray(data.categories) || !data.categories.length || data.categories.length > 200
        || !data.categories.every(label => typeof label === "string")
        || !Array.isArray(data.series) || !data.series.length || data.series.length > 16
        || !data.series.every(series => series && typeof series.name === "string"
          && Array.isArray(series.values) && series.values.length === data.categories.length
          && series.values.every(Number.isFinite))
        || (data.kind === "pie" && (data.series.length !== 1
          || data.series[0].values.some(value => value < 0)
          || !data.series[0].values.some(value => value > 0)))) continue;
    const rect = bounds(node);
    if (rect.left < 0 || rect.top < 0 || rect.right > width || rect.bottom > height) continue;
    charts.push({ ...data, ...object(node, rect.x, rect.y, rect.width, rect.height) });
    state.charts.push(node);
  }
  const inChart = node => state.charts.some(chart => chart.contains(node));
  const tables = [...page.querySelectorAll("table")].flatMap(node => {
    if (inChart(node) || node.parentElement.closest("table")) return [];
    const table = tableFor(node);
    if (!table) return [];
    return [table];
  });
  const nativeTables = new Set(state.tables.map(node => node.matches("table") ? node : node.querySelector("table")));
  const candidates = [...page.querySelectorAll(markedText + "," + blocks + ",div,span,a,code")]
    .filter(node => !inChart(node) && !state.charts.some(chart => node.contains(chart)) && visible(node) && !nativeTables.has(node.closest("table")) && !node.closest(unsupported)
      && !node.querySelector(unsupported + "," + contentBlocks)
      && !(node.children.length > 1 && /flex|grid/.test(getComputedStyle(node).display)));
  const textRoots = new Set(candidates);
  const nodes = elements.filter(node => {
    if (inChart(node)) return false;
    if (node.matches(imageSelector)) return visible(node);
    if (!textRoots.has(node)) return false;
    // An inline editable field inside a paragraph belongs to that paragraph's
    // text box. Otherwise the surrounding unmarked text would be lost.
    for (let parent = node.parentElement; parent !== page; parent = parent.parentElement) {
      if (textRoots.has(parent)) return false;
    }
    return true;
  });
  const images = [];
  const texts = new Map();
  for (const node of nodes) {
    const rect = bounds(node);
    if (node.matches(imageSelector)) {
      if (node.parentElement.closest(imageSelector) && page.contains(node.parentElement.closest(imageSelector))) continue;
      if (node.localName !== "img" && node.innerText.trim()) {
        throw Error("An image field contains visible text: " + pageId);
      }
      const x = Math.max(0, Math.floor(rect.left));
      const y = Math.max(0, Math.floor(rect.top));
      const w = Math.min(width, Math.ceil(rect.right)) - x;
      const h = Math.min(height, Math.ceil(rect.bottom)) - y;
      images.push(object(node, x, y, w, h));
      state.images.push(node);
      continue;
    }
    const text = readText(node);
    if (!text) continue;
    const { align, x, y, measuredWidth, extra, last, lineHeight, highlighted, lines } = text;
    const box = boxFor(node);
    const frame = box?.rect;
    if (box) state.boxes.add(box.node);
    for (const inlineNode of highlighted) state.highlights.add(inlineNode);
    texts.set(node, {
      ...object(node, frame?.x ?? x, frame?.y ?? y, frame?.width ?? (measuredWidth + extra),
        frame?.height ?? Math.max(rect.bottom - y, last.top - y + lineHeight)),
      box: box ? {
        fill: box.fill, stroke: box.stroke, radius: box.radius,
        left: Math.max(0, x - frame.left),
        top: Math.max(0, y - frame.top),
        right: Math.max(0, frame.right - x - measuredWidth - extra),
      } : null,
      align, lines
    });
    state.texts.push(node);
  }
  const groups = [];
  const grouped = new Set();
  for (const node of [...elements].reverse()) {
    if (!node.childElementCount || node.matches("table") || node.querySelector(unsupported + ",table")) continue;
    const members = [...texts.keys()].filter(text => text !== node && node.contains(text));
    if (members.length < 2 || members.some(member => grouped.has(member))) continue;
    const box = readBox(node);
    if (!box) continue;
    // Group only containers whose visible text was recovered completely.
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let fragment;
    let complete = true;
    while ((fragment = walker.nextNode())) {
      const parent = fragment.parentElement;
      if (fragment.data.trim() && parent.getClientRects().length && getComputedStyle(parent).visibility === "visible"
          && !members.some(member => member.contains(fragment))) {
        complete = false;
        break;
      }
    }
    if (!complete) continue;
    const { rect, fill, stroke, radius } = box;
    groups.push({
      ...object(node, rect.x, rect.y, rect.width, rect.height),
      frame: { fill, stroke, radius },
      texts: members.map(member => texts.get(member))
    });
    state.boxes.add(node);
    members.forEach(member => grouped.add(member));
  }
  for (const member of grouped) texts.delete(member);
  return { images, texts: [...texts.values()], tables, groups, charts };
}
