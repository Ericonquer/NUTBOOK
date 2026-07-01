import fs from "node:fs";

const source = fs.readFileSync("dist/index.html", "utf8");

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]+)\\}`));
  return match?.groups?.body || "";
}

function assertIncludes(block, rule, message) {
  if (!block.includes(rule)) {
    throw new Error(message);
  }
}

const settingsRowButtonRow = cssBlock(".settings-row > .button-row");
assertIncludes(
  settingsRowButtonRow,
  "flex: 0 0 auto;",
  "settings source row actions must not shrink when a path is long"
);
assertIncludes(
  settingsRowButtonRow,
  "flex-wrap: nowrap;",
  "settings source row actions must stay horizontal"
);

const settingsRowPath = cssBlock(".settings-row-path");
assertIncludes(
  settingsRowPath,
  "overflow-wrap: anywhere;",
  "settings source paths must wrap inside the copy column"
);
