import fs from "node:fs";

const source = fs.readFileSync("dist/index.html", "utf8");

function assertIncludes(fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message);
  }
}

assertIncludes("markdown-title-input", "markdown title must render as an editable input");
assertIncludes("markdown-title-copy", "markdown title copy column must be sized explicitly");
assertIncludes("commitMarkdownDocumentTitle", "markdown title edits must sync back to markdown content");
assertIncludes("setMarkdownDocumentTitle", "markdown title updates must replace or insert the H1");
assertIncludes("width: 100%;", "markdown title input must use the full content width");
assertIncludes(
  ".milkdown-editor-root .ProseMirror > h1:first-child",
  "the first rich-editor H1 must be hidden because it is promoted to the shell title"
);
assertIncludes(
  "markdown-document-title-source",
  "the promoted H1 must also be hidden when it is not the first editor child"
);
