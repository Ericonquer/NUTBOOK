import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const bundlePath = resolve("dist/assets/markdown-editor.js");
let code = readFileSync(bundlePath, "utf8");

const replacements = [
  [
    String.raw`new RegExp("(?<![\\w:/])(?:\\*\\*|__)([^*_]+?)(?:\\*\\*|__)(?![\\w/])$")`,
    String.raw`new RegExp("(?:^|[^\\\\w:/])(?:\\\\*\\\\*|__)([^*_]+?)(?:\\\\*\\\\*|__)(?![\\\\w/])$")`
  ],
  [
    String.raw`/^(?<hashes>#+)\s$/`,
    String.raw`/^(#+)\s$/`
  ],
  [
    "/^```(?<language>[a-z]*)?[\\s\\n]$/",
    "/^```([a-z]*)?[\\s\\n]$/"
  ],
  [
    String.raw`/!\[(?<alt>.*?)]\((?<filename>.*?)\s*(?="|\))"?(?<title>[^"]+)?"?\)/`,
    String.raw`/!\[(.*?)]\((.*?)\s*(?="|\))"?([^"]+)?"?\)/`
  ],
  [
    String.raw`new RegExp("(?<![\\w:/])(~{1,2})(.+?)\\1(?!\\w|\\/)")`,
    String.raw`new RegExp("(?:^|[^\\\\w:/])(~{1,2})(.+?)\\\\1(?!\\\\w|\\\\/)")`
  ],
  [
    String.raw`/^\|(?<col>\d+)[xX](?<row>\d+)\|\s$/`,
    String.raw`/^\|(\d+)[xX](\d+)\|\s$/`
  ],
  [
    String.raw`/^\[(?<checked>\s|x)\]\s$/`,
    String.raw`/^\[(\s|x)\]\s$/`
  ]
];

code = code.replaceAll(
  String.raw`[new RegExp("(?<=^|\\s|\\p{P}|\\p{S})([-.\\w+]+)@([-\\w]+(?:\\.[-\\w]+)+)", "gu"),`,
  String.raw`[new RegExp("(^|\\\\s|[\\\\u0021-\\\\u002F\\\\u003A-\\\\u0040\\\\u005B-\\\\u0060\\\\u007B-\\\\u007E])([-.\\\\w+]+)@([-\\\\w]+(?:\\\\.[-\\\\w]+)+)", "gu"),`
);

code = code.replaceAll(
  String.raw`new RegExp("\\p{P}|\\p{S}", "u")`,
  String.raw`new RegExp("[\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]")`
);

const missing = [];
for (const [from, to] of replacements) {
  if (!code.includes(from)) {
    continue;
  }
  code = code.replaceAll(from, to);
}

const strongInputRuleMarker = `displayName: "InputRule<strong>"`;
const strongInputRuleMarkerIndex = code.indexOf(strongInputRuleMarker);
const strongInputRuleStart = strongInputRuleMarkerIndex >= 0 ? code.lastIndexOf("var ", strongInputRuleMarkerIndex) : -1;
const strongInputRuleEnd = strongInputRuleStart >= 0 ? code.indexOf("));", strongInputRuleStart) + 3 : -1;
const strongInputRuleGetAttr = `{ getAttr: (e) => ({ marker: e[0].startsWith("*") ? "*" : "_" }) }`;
const strongInputRulePatch = `{ updateCaptured: (e) => e.fullMatch.startsWith("**") || e.fullMatch.startsWith("__") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) }, getAttr: (e) => ({ marker: (e[0].startsWith("**") || e[0].startsWith("__") ? e[0] : e[0].slice(1)).startsWith("*") ? "*" : "_" }) }`;
if (strongInputRuleStart < 0 || strongInputRuleEnd < strongInputRuleStart) {
  // Inline mark input rules are disabled below; this legacy compatibility patch is best-effort.
} else {
  const strongInputRule = code.slice(strongInputRuleStart, strongInputRuleEnd);
  const patchedStrongInputRule = strongInputRule.replace(strongInputRuleGetAttr, strongInputRulePatch);
  if (patchedStrongInputRule !== strongInputRule) {
    code = `${code.slice(0, strongInputRuleStart)}${patchedStrongInputRule}${code.slice(strongInputRuleEnd)}`;
  }
}

code = code.replace(
  /(\w+\(new RegExp\("\(\?:\^\|\[\^\\\\\\\\w:\/\]\)\(~\{1,2\}\)\(\.\+\?\)\\\\\\\\1\(\?!\\\\\\\\w\|\\\\\\\\\/\)"\),\s*\w+\.type\(t\))\)/,
  `$1, { updateCaptured: (e) => e.fullMatch.startsWith("~") ? e : { start: e.start + 1, fullMatch: e.fullMatch.slice(1) } })`
);

code = code.replace(
  /(\]\.flat\(\),\s+\w+\s*=\s*)\[[\s\S]*?\](,\s+\w+\s*=\s*H\("IsMarkSelected")/,
  "$1[]$2"
);

code = code.replaceAll(
  `], BN = [
  PN,
  AN,
  EN,
  ON,
  IN,
  LN,
  zN
].flat()`,
  `], BN = [
  PN,
  AN,
  EN,
  IN,
  LN,
  zN
].flat()`
);

const inlineMarkInputRulesPattern = /,\s*([\w$]+)\s*=\s*\[\s*[\w$]+,\s*[\w$]+,\s*[\w$]+,\s*[\w$]+\s*\](\s*,\s*[\w$]+\s*=\s*[\w$]+\("IsMarkSelected")/;
if (inlineMarkInputRulesPattern.test(code)) {
  code = code.replace(inlineMarkInputRulesPattern, ", $1 = []$2");
} else {
  const markSelectionIndex = code.indexOf('"IsMarkSelected"');
  const listStart = markSelectionIndex >= 0 ? code.lastIndexOf("=[", markSelectionIndex) : -1;
  const listEnd = listStart >= 0 ? code.indexOf("]", listStart) : -1;
  const inlineList = listStart >= 0 && listEnd > listStart ? code.slice(listStart, listEnd + 1) : "";
  const hasInlineMarks =
    inlineList &&
    ["InputRule<emphasis>|Star", "InputRule<emphasis>|Underscore", "InputRule<inlineCodeInputRule>", "InputRule<strong>"]
      .some((marker) => code.lastIndexOf(marker, listStart) >= 0);
  if (hasInlineMarks) {
    code = `${code.slice(0, listStart)}=[]${code.slice(listEnd + 1)}`;
  } else {
    missing.push("inline mark input rules disable patch");
  }
}

code = code.replace(
  /const n = \(\([^;]+?e\.groups[^;]+?hashes[^;]+?length\)\s*\|\|\s*0, \{ \$from: r \} = t\.get\(([^)]+)\)\.state\.selection, i = r\.node\(\);/,
  `const n = (e[1] || "").length || 0, { $from: r } = t.get($1).state.selection, i = r.node();`
);

code = code.replaceAll(
  `return { language: ((n = e.groups) == null ? void 0 : n.language) ?? "" };`,
  `return { language: e[1] ?? "" };`
);

writeFileSync(bundlePath, code);

if (missing.length > 0) {
  console.warn("Markdown editor compatibility patch skipped patterns that were not found:");
  for (const pattern of missing) console.warn(`- ${pattern}`);
}
