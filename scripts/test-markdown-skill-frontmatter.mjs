import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const critiquePath = "src-tauri/tests/fixtures/markdown-skill-frontmatter/ordinary-frontmatter.md";
const critique = readFileSync(critiquePath, "utf8");
const critiqueFrontmatter = critique.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] || "";
assert.ok(critiqueFrontmatter, "the real critique acceptance document must contain YAML frontmatter");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (error) => console.error(`browser page error: ${error.stack || error.message}`));

async function mount(markdown, fileName) {
  await page.evaluate(async ({ markdown, fileName }) => {
    window.__frontmatterEditor?.destroy?.();
    const root = document.getElementById("editor");
    root.innerHTML = "";
    window.__frontmatterEditor = await window.NutbookMarkdownEditor.create({
      root,
      markdown,
      fileName
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { markdown, fileName });
}

try {
  await page.setContent('<div id="editor"></div>');
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  await mount(critique, "2026-08-12T03-13-26Z__dist-index-html.md");
  assert.equal(
    await page.locator(".skill-frontmatter").count(),
    0,
    "an ordinary critique with YAML frontmatter must not show Skill metadata controls"
  );
  const baseline = await page.evaluate(() => window.__frontmatterEditor.getBaselineMarkdown());
  assert.equal(
    baseline.slice(0, critiqueFrontmatter.length),
    critiqueFrontmatter,
    "opening an ordinary frontmatter document must preserve its metadata byte-for-byte"
  );

  const skillLikeOrdinary = "---\nname: ordinary\ndescription: Not a skill\ntrigger_keywords: [report]\n---\n\n# Ordinary\n";
  const skillLikeFrontmatter = skillLikeOrdinary.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] || "";
  await mount(skillLikeOrdinary, "ordinary.md");
  assert.equal(
    await page.locator(".skill-frontmatter").count(),
    0,
    "Skill-like field names must not override the ordinary Markdown file identity"
  );
  assert.ok(
    (await page.evaluate(() => window.__frontmatterEditor.getBaselineMarkdown()))
      .startsWith(skillLikeFrontmatter),
    "a non-SKILL.md document must preserve even Skill-like frontmatter unchanged"
  );
  await page.locator("#editor .ProseMirror h1").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" FRONTMATTER-BODY-EDIT");
  await page.waitForTimeout(350);
  const edited = await page.evaluate(() => window.__frontmatterEditor.getMarkdown());
  assert.equal(
    edited.slice(0, skillLikeFrontmatter.length),
    skillLikeFrontmatter,
    "editing and serializing an ordinary document must not rewrite its YAML frontmatter"
  );
  assert.match(edited, /FRONTMATTER-BODY-EDIT/, "the ordinary document body must remain editable");

  const skill = "---\nname: real-skill\ndescription: A real skill\ntrigger_keywords: [skill]\n---\n\n# Real Skill\n";
  await mount(skill, "/tmp/example/SKILL.md");
  assert.equal(
    await page.locator(".skill-frontmatter").count(),
    1,
    "an actual SKILL.md document must retain its editable metadata controls"
  );
  await page.locator('[data-frontmatter-field="name"]').fill("updated-skill");
  await page.waitForTimeout(150);
  assert.match(
    await page.evaluate(() => window.__frontmatterEditor.getMarkdown()),
    /^---\nname: updated-skill\n/m,
    "editing a real SKILL.md metadata field must still serialize the updated value"
  );
} finally {
  await page.evaluate(() => window.__frontmatterEditor?.destroy?.()).catch(() => {});
  await browser.close();
}

console.log("Markdown Skill frontmatter boundary regression passed.");
