// PR B 人工验收返修：外部 Markdown 标签激活链路的真实端到端验证。
//
// 真实链路（浏览器内运行真实 dist 前端，非 VM 切片）：
//   系统打开事件 → inbox drain → external_session_resolve(open)
//   → openExternalSessionFromResponse → activateExternalTab → renderTabs/renderViewer
//   → 五秒意图提示 → 手动导航（回首页）取消提示（§3.3/验收16：已取消终态，
//   不写已提示记录）→ 同路径重新请求 → 重新提示 → 「仅打开」→ 正文展示
//   → 切走点回 → 可编辑 → 保存（external_session_save）。
//
// 测试侧 shim（不改动 dist 产品代码）：给 listenRaw/inject invoke 注入测试
// 覆写点并暴露最小钩子；external_* 命令由本脚本模拟后端返回。
//
// 根因修复记录：renderTabs 点击分支曾把 data-tab-id 无条件 Number() 化，
// external:* 字符串 id 变 NaN 导致标签无法激活（已修复为与 data-close-tab
// 同口径的双类型解析）。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const origin = process.env.NUTBOOK_TAB_TEST_ORIGIN || "http://127.0.0.1:4177";
const server = process.env.NUTBOOK_TAB_TEST_ORIGIN ? null : spawn(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "dist",
  "--host", "127.0.0.1",
  "--port", "4177",
  "--strictPort"
], { stdio: "ignore" });

// ---- 测试侧 shim：只存在于本脚本的内存变换，dist 产品代码保持纯净 ----
const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const LISTEN_RAW_ANCHOR = "function listenRaw(event, handler, target) {";
const INVOKE_ANCHOR = "async function invoke(command, args = {}) {\n        if (!invokeRaw) {";
const BOOT_ANCHOR = "      boot();";
const SHIMMED_HTML = INDEX_HTML
  .replace(
    LISTEN_RAW_ANCHOR,
    `${LISTEN_RAW_ANCHOR} if (window.__listenRawOverride) { return window.__listenRawOverride(event, handler, target); }`
  )
  .replace(
    INVOKE_ANCHOR,
    `${INVOKE_ANCHOR}
        if (window.__invokeOverride && window.__invokeOverride[command]) { return window.__invokeOverride[command](args); }`
  )
  .replace(
    BOOT_ANCHOR,
    `      window.__extTestHooks = {
        appState: () => appState,
        renderTabs,
        renderViewer,
        activateExternalTab,
        startExternalOpenCoordinator
      };
      boot();`
  );
for (const [anchor, replaced] of [[LISTEN_RAW_ANCHOR, 1], [INVOKE_ANCHOR, 1], [BOOT_ANCHOR, 1]]) {
  assert.equal(
    INDEX_HTML.split(anchor).length - 1,
    replaced,
    `shim anchor must appear exactly ${replaced}x in dist/index.html: ${anchor.slice(0, 40)}`
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleLogs = [];
page.on("console", (message) => consoleLogs.push(message.text()));
page.on("pageerror", (error) => consoleLogs.push(`PAGEERROR: ${error.message}`));

async function waitForOrigin() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server?.exitCode != null) throw new Error(`tab activation test server exited with ${server.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch (_) { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`tab activation test server did not start at ${origin}`);
}

const SESSION_ID = "s-tab-activation-1";

async function bootstrapWithShim() {
  // 安装测试桥：listenRaw 捕获、external_* 命令覆写、最小钩子。
  await page.evaluate((sessionId) => {
    const hooks = window.__extTestHooks;
    if (!hooks) throw new Error("test hooks must be injected into the real app script");
    window.__events = {};
    window.__invokeLog = [];
    window.__drainQueue = [];
    window.__listenRawOverride = (event, handler) => {
      window.__events[event] = handler;
      return Promise.resolve(() => {});
    };
    const state = hooks.appState();
    state.isTauri = true;
    // 路径 → session 档案：同路径复用同一 session（重新请求走已存在分支
    // 重新提示），新路径派发新 session（双请求 single-flight 反例使用）。
    const sessionProfiles = {
      "/tmp/demo/note.md": {
        sessionId,
        fileName: "note.md",
        title: "外部手记",
        raw: "# 外部手记\n\n系统打开的正文内容。\n"
      },
      "/tmp/demo/second.md": {
        sessionId: "s-tab-activation-2",
        fileName: "second.md",
        title: "第二份手记",
        raw: "# 第二份手记\n\n第二批内容。\n"
      },
      "/tmp/demo/third.md": {
        sessionId: "s-tab-activation-3",
        fileName: "third.md",
        title: "第三份手记",
        raw: "# 第三份手记\n\n第三批内容。\n"
      }
    };
    window.__invokeOverride = {
      external_open_ready: async () => true,
      external_open_drain: async () => ({ requests: window.__drainQueue.splice(0), watermark: 1 }),
      external_session_resolve: async (args) => {
        window.__invokeLog.push(["resolve", args]);
        if (args?.payload?.phase === "inspect") return { kind: "plain" };
        const path = args?.payload?.path || "/tmp/demo/note.md";
        const profile = sessionProfiles[path] || sessionProfiles["/tmp/demo/note.md"];
        return {
          kind: "external",
          sessionId: profile.sessionId,
          generation: 1,
          path,
          fileName: profile.fileName,
          raw: profile.raw,
          html: `<h1>${profile.title}</h1><p>系统打开的正文内容。</p>`,
          title: profile.title,
          baseDir: "/tmp/demo",
          baseline: { hash: "h1" },
          promptRequired: true,
          resolution: "unindexed",
          diskChanged: false
        };
      },
      external_session_mark_opened_only: async (args) => {
        window.__invokeLog.push(["mark_opened_only", args]);
        return true;
      },
      external_session_save: async (args) => {
        window.__invokeLog.push(["save", args]);
        return { status: "saved", baseline: { hash: "h2" } };
      }
    };
    hooks.startExternalOpenCoordinator();
  }, SESSION_ID);
  // 模拟系统打开：Rust inbox 已有请求 → 通知前端 pump。
  await page.evaluate(() => {
    window.__drainQueue.push({ orderedPaths: ["/tmp/demo/note.md"] });
    window.__events["nutbook-external-open"]({ payload: {} });
  });
}

try {
  await waitForOrigin();
  // 命中 "/" 时返回注入了测试钩子的真实 HTML（其余资源走 vite 正常返回）。
  await page.route((url) => url.pathname === "/" && url.origin === origin, (route) => {
    route.fulfill({ contentType: "text/html; charset=utf-8", body: SHIMMED_HTML }).catch(() => {});
  });
  await page.goto(`${origin}/?readmeDemo=1`, { waitUntil: "domcontentloaded" });
  // 第一步：真实打开 demo item 101，制造「当前已有另一个标签」的场景。
  await page.locator('[data-open-item="101"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('[data-open-item="101"]').click();
  await page.locator("#milkdownEditorRoot .ProseMirror").waitFor({ state: "visible" });
  // 人工验收第 2 轮：手动展开侧栏，制造「未收拢」起点，验证 external 激活会收拢。
  await page.evaluate(() => {
    document.getElementById("toggleSidebarButton")?.click();
  });
  assert.equal(
    await page.evaluate(() => window.__extTestHooks.appState().isSidebarCollapsed),
    false,
    "前置条件：侧栏必须已被手动展开"
  );

  // 第二步：模拟系统打开 → 仅打开。
  await bootstrapWithShim();
  await page.locator(`[data-tab-id="external:${SESSION_ID}"]`).waitFor({ state: "visible", timeout: 5000 });
  // 人工验收第 2 轮：意图提示必须带轻遮罩（覆盖主内容区、不拦截交互）。
  {
    const scrim = page.locator(".external-open-prompt-scrim");
    assert.ok(await scrim.isVisible(), "意图提示可见时必须有轻遮罩");
    // 侧栏收拢带 220ms 过渡：轮询等待遮罩与主内容区对齐落定（产品代码
    // 会在 transitionend 重定位）。
    await page.waitForFunction(() => {
      const scrimBox = document.querySelector(".external-open-prompt-scrim")?.getBoundingClientRect();
      const viewerBox = document.getElementById("viewerBody")?.getBoundingClientRect();
      if (!scrimBox || !viewerBox) return false;
      return ["left", "top", "width", "height"].every(
        (key) => Math.abs(scrimBox[key] - viewerBox[key]) <= 2
      );
    }, undefined, { timeout: 2000 });
    const viewerBox = await page.locator("#viewerBody").boundingBox();
    assert.ok(viewerBox, "主内容区必须有几何尺寸");
    // pointer-events: none —— 遮罩不拦截对下方内容的命中。
    assert.equal(
      await page.evaluate(() => {
        const scrim = document.querySelector(".external-open-prompt-scrim");
        return scrim ? getComputedStyle(scrim).pointerEvents : "missing";
      }),
      "none",
      "遮罩必须是 pointer-events: none"
    );
    // §3.3/验收16：提示尚未裁决时手动导航（回首页）必须先取消提示——清
    // timer、移除浮层、请求进入已取消终态（不写已提示记录、不启动接入）。
    // 旧 r3 断言「home 保留提示、切回后遮罩恢复」固化了错误行为，已翻转。
    await page.locator(".external-open-prompt-card").hover(); // 暂停倒计时
    await page.locator('[data-home-tab="true"]').click();
    await page.waitForFunction(
      () => !document.querySelector(".external-open-prompt"),
      undefined,
      { timeout: 2000 }
    );
    assert.equal(
      await page.evaluate(() =>
        window.__invokeLog.filter(([command]) => command === "mark_opened_only").length),
      0,
      "手动导航取消提示不得写已提示记录（已取消终态）"
    );
    // 已打开的标签不因取消被删除；切回后正文仍在，且不复活提示（重新提示
    // 只能由新的打开请求触发）。
    await page.locator(`[data-tab-id="external:${SESSION_ID}"]`).click();
    await page.locator("#milkdownEditorRoot .ProseMirror").waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() => Boolean(document.querySelector(".external-open-prompt"))),
      false,
      "取消后切回标签不得复活提示"
    );
    // 重新发起打开请求（同路径再次系统打开）→ 重新解析、重新提示。
    await page.evaluate(() => {
      window.__drainQueue.push({ orderedPaths: ["/tmp/demo/note.md"] });
      window.__events["nutbook-external-open"]({ payload: {} });
    });
    await page
      .locator(".external-open-prompt-card")
      .waitFor({ state: "visible", timeout: 3000 });
  }
  await page.locator('.external-open-prompt [data-prompt-action="open-only"]').click();
  await page.waitForFunction((sessionId) => {
    return Boolean(document.querySelector(`[data-tab-id="external:${sessionId}"]`))
      && !document.querySelector(".external-open-prompt");
  }, SESSION_ID);
  const markOpenOnlyCalls = await page.evaluate(() =>
    window.__invokeLog.filter(([command]) => command === "mark_opened_only"));
  assert.equal(markOpenOnlyCalls.length, 1, "仅打开必须真实调用 external_session_mark_opened_only");
  assert.equal(
    await page.evaluate(() => window.__extTestHooks.appState().isSidebarCollapsed),
    true,
    "external 激活后侧栏必须自动收拢（对齐 indexed 打开行为）"
  );

  // 第三步：正文自动展示（真实编辑器内容，不是标签 DOM 存在）。
  await page.locator("#milkdownEditorRoot .ProseMirror").waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("系统打开的正文内容"));

  // ---- 验收模式：完整链路断言 ----
  {
    // 第四步：切走（demo item 标签）→ 点回 external 标签。
    await page.locator('[data-tab-id="101"]').click();
    await page.waitForFunction(() =>
      document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("这是浏览器 mock 模式下的 Markdown 预览"));
    await page.locator(`[data-tab-id="external:${SESSION_ID}"]`).click();
    await page.locator("#milkdownEditorRoot .ProseMirror").waitFor({ state: "visible" });
    await page.waitForFunction((sessionId) => {
      const state = window.__extTestHooks.appState();
      return state.activeTabId === `external:${sessionId}`
        && document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("系统打开的正文内容");
    }, SESSION_ID);

    // 第五步：可编辑 —— 真实键入。
    await page.locator("#milkdownEditorRoot .ProseMirror").click();
    await page.keyboard.press("Meta+ArrowDown");
    await page.keyboard.type(" TAB_SWITCH_SENTINEL");
    await page.waitForFunction(() =>
      document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("TAB_SWITCH_SENTINEL"));

    // 第六步：可保存 —— 真实保存命令 + dirty 收敛。
    await page.keyboard.press("Meta+s");
    await page.waitForFunction(() =>
      window.__invokeLog.some(([command]) => command === "save"), undefined, { timeout: 5000 });
    const saveCall = await page.evaluate(() =>
      window.__invokeLog.find(([command]) => command === "save"));
    assert.equal(saveCall[1]?.payload?.sessionId, SESSION_ID, "保存必须携带 external sessionId");
    assert.match(saveCall[1]?.payload?.content ?? "", /TAB\\?_SWITCH\\?_SENTINEL/, "保存内容必须包含真实键入的正文（markdown 序列化可能转义下划线）");
    await page.waitForFunction(() => {
      const state = window.__extTestHooks.appState();
      const tab = state.tabs.find((entry) => entry.external?.sessionId === "s-tab-activation-1");
      return tab && tab.isDirty === false && /TAB\\?_SWITCH\\?_SENTINEL/.test(tab.preview?.raw ?? "");
    }, undefined, { timeout: 5000 });
    // GUI-r5 问题 2：关闭确认用的 isMarkdownTabDirty 取 markdownBaseline ??
    // preview.raw——旧缺陷保存后只更新 preview.raw，关闭仍提示「未保存修改」。
    // 保存成功后 baseline 必须推进到保存正文，脏判定必须整体收敛。
    await page.waitForFunction(() => {
      const state = window.__extTestHooks.appState();
      const tab = state.tabs.find((entry) => entry.external?.sessionId === "s-tab-activation-1");
      return tab
        && tab.markdownBaseline === tab.preview.raw
        && window.isMarkdownTabDirty?.(tab) === false;
    }, undefined, { timeout: 5000 });

    // 第七步：保存后再切走点回，正文仍在（session 保持）。
    await page.locator('[data-tab-id="101"]').click();
    await page.waitForFunction(() =>
      document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("这是浏览器 mock 模式下的 Markdown 预览"));
    await page.locator(`[data-tab-id="external:${SESSION_ID}"]`).click();
    await page.waitForFunction(() =>
      document.querySelector("#milkdownEditorRoot .ProseMirror")?.innerText?.includes("SENTINEL"));

    assert.equal(
      (await page.evaluate(() => window.__extTestHooks.appState().activeTabId)),
      `external:${SESSION_ID}`,
      "最终活动标签必须是 external 标签"
    );
  }

  // ---- Codex 复核（2026-09-09 P1③ R2）：双独立请求 + 导航取消的 single-flight ----
  {
    const countMarks = () => page.evaluate(() =>
      window.__invokeLog.filter(([command]) => command === "mark_opened_only").map(([, args]) => args?.payload?.sessionId));
    // 两个新路径请求同时入队：请求级 single-flight 下，A 的提示裁决前 B 不得
    // 解析/激活——third 标签不存在，活动标签与可见提示同为 second。
    await page.evaluate(() => {
      window.__drainQueue.push(
        { orderedPaths: ["/tmp/demo/second.md"] },
        { orderedPaths: ["/tmp/demo/third.md"] }
      );
      window.__events["nutbook-external-open"]({ payload: {} });
    });
    await page.locator(".external-open-prompt-card").waitFor({ state: "visible", timeout: 3000 });
    await page.waitForFunction(() =>
      (document.querySelector(".external-open-prompt-title")?.textContent ?? "").includes("second.md"),
      undefined, { timeout: 2000 });
    assert.equal(
      await page.locator(".external-open-prompt").count(),
      1,
      "同一时刻只能存在一个提示浮层"
    );
    assert.equal(
      await page.evaluate(() => window.__extTestHooks.appState().activeTabId),
      "external:s-tab-activation-2",
      "可见提示与活动文件必须匹配（A 提示未决时 B 不得激活）"
    );
    assert.ok(
      !(await page.evaluate(() =>
        window.__extTestHooks.appState().tabs.some((tab) => tab.external?.sessionId === "s-tab-activation-3"))),
      "B 请求不得在 A 裁决前被解析（不提前创建标签）"
    );
    const marksBefore = await countMarks();
    // 悬停暂停倒计时 → 点 home 取消 second：导航收敛后 B 才被处理——third
    // 解析、激活并出提示（请求不丢），second 走已取消终态（不写已提示记录）。
    await page.locator(".external-open-prompt-card").hover();
    await page.locator('[data-home-tab="true"]').click();
    await page.waitForFunction(() =>
      (document.querySelector(".external-open-prompt-title")?.textContent ?? "").includes("third.md"),
      undefined, { timeout: 3000 });
    assert.equal(
      await page.locator(".external-open-prompt").count(),
      1,
      "收敛点只允许一个新提示：不得残留被遮挡的旧浮层，也不得双浮层并存"
    );
    assert.equal(
      await page.evaluate(() => window.__extTestHooks.appState().activeTabId),
      "external:s-tab-activation-3",
      "third 处理后可见提示与活动文件必须匹配"
    );
    const marksAfterCancel = await countMarks();
    assert.deepEqual(marksAfterCancel, marksBefore, "取消 second 不得写已提示记录");
    // third 走「仅打开」→ mark 恰好新增一次（single-flight 不丢后续请求）。
    await page.locator('.external-open-prompt [data-prompt-action="open-only"]').click();
    await page.waitForFunction(
      () => !document.querySelector(".external-open-prompt"),
      undefined, { timeout: 3000 });
    const marksFinal = await countMarks();
    assert.equal(marksFinal.length, marksAfterCancel.length + 1, "后续请求必须被真实裁决（仅打开恰好一次）");
    assert.ok(
      marksFinal.includes("s-tab-activation-3"),
      "「仅打开」必须作用于收敛后处理的 third 请求"
    );
  }
  const pageErrors = consoleLogs.filter((line) => line.startsWith("PAGEERROR:"));
  assert.deepEqual(pageErrors, [], "全程不得出现页面异常");
  console.log("external tab activation acceptance passed");
} finally {
  await browser.close();
  server?.kill();
}
