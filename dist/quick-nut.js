(() => {
  const invoke = window.__TAURI_INTERNALS__.invoke;
  const workspace = document.getElementById("nutsWorkspace");
  const form = document.getElementById("quickNutForm");
  const field = document.getElementById("quickNutText");
  const pin = document.getElementById("quickNutPin");
  const close = document.getElementById("quickNutClose");
  const save = document.getElementById("quickNutSave");
  const status = document.getElementById("quickNutStatus");
  const boardLabel = document.getElementById("quickNutBoardLabel");
  const picker = window.NutbookNutsPicker("quickNutBoard", "quickNutBoardLabel");
  const mac = navigator.platform.includes("Mac");
  let english = false;
  let generation = 0;
  let pinned = false;
  let pinning = false;
  let closing = false;
  let saving = false;
  let composing = false;
  let saved = false;
  let resetOnOpen = false;

  const copy = (zh, en) => english ? en : zh;
  const action = (action, session = generation) => invoke("quick_nut_window_action", { action, generation: session });
  const error = value => { status.textContent = String(value); };
  function label(button, text) {
    button.setAttribute("aria-label", text);
    if (button.hasAttribute("data-tooltip")) button.dataset.tooltip = text;
  }

  function render() {
    document.documentElement.lang = copy("zh-CN", "en");
    document.title = document.getElementById("quickNutTitle").textContent = copy("记 NUT", "New NUT");
    field.placeholder = copy("我刚想到……", "I just thought of…");
    field.readOnly = saving || saved;
    boardLabel.textContent = copy("收进白板", "Save to");
    pin.disabled = pinning || saving || closing;
    pin.setAttribute("aria-pressed", String(pinned));
    label(pin, pinned ? copy("取消置顶", "Unpin window") : copy("置顶", "Keep on top"));
    close.disabled = saving || closing;
    label(close, copy("收起", "Hide"));
    const title = saved ? copy("再记一条", "New NUT") : copy("收下 NUT", "Save NUT");
    save.textContent = title;
    label(save, title);
    save.setAttribute("aria-keyshortcuts", mac ? "Meta+Enter" : "Control+Enter");
    save.disabled = saving || pinning || closing || (!saved && (!field.value.trim() || !picker.value));
  }

  async function open(session) {
    if (session < generation) return;
    generation = session;
    closing = false;
    workspace.dataset.open = "";
    if (resetOnOpen) {
      resetOnOpen = false;
      newNote();
    }
    render();
    if (!saved) field.focus({ preventScroll: true });
    try {
      const useEnglish = await invoke("quick_nut_language");
      const boards = await invoke("nuts_boards");
      if (session !== generation || closing) return;
      english = useEnglish;
      picker.setOptions(boards.map(board => ({
        value: board.id,
        label: board.id === "default" && board.name === "随手记" ? copy("随手记", "Quick notes") : board.name,
      })), picker.value || "default");
      render();
    } catch (value) { if (session === generation && !closing) error(value); }
  }

  async function dismiss() {
    if (closing || saving || composing || !generation) return;
    const session = generation;
    closing = true;
    picker.close();
    render();
    delete workspace.dataset.open;
    try { await action("hide", session); }
    catch (value) {
      if (session !== generation) return;
      error(value);
      closing = false;
      workspace.dataset.open = "";
      render();
    }
  }

  function newNote() {
    saved = false;
    field.value = "";
    status.textContent = "";
    render();
    field.focus({ preventScroll: true });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (saving || pinning || closing || composing) return;
    if (saved) { newNote(); return; }
    const markdown = field.value.trim();
    const boardId = picker.value;
    if (!markdown || !boardId) return;
    saving = true;
    render();
    try {
      await invoke("nuts_board_note", { boardId, markdown });
    } catch (value) {
      error(value);
      saving = false;
      render();
      field.focus();
      return;
    }
    saving = false;
    saved = true;
    status.textContent = copy("已保存", "Saved");
    render();
    invoke("notify_quick_nut_saved", { boardId }).catch(console.error);
    if (!pinned) {
      resetOnOpen = true;
      await dismiss();
    }
  });

  pin.onclick = async () => {
    if (pinning || closing) return;
    pinning = true;
    render();
    try {
      await action(pinned ? "unpin" : "pin");
      pinned = !pinned;
    } catch (value) { error(value); }
    finally { pinning = false; render(); }
  };
  close.onclick = dismiss;
  field.addEventListener("input", render);
  field.addEventListener("compositionstart", () => { composing = true; });
  field.addEventListener("compositionend", () => { composing = false; });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || composing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      void dismiss();
    } else if (event.key === "Enter" && (mac ? event.metaKey : event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.getElementById("quickNutDrag").addEventListener("mousedown", event => {
    if (event.button === 0 && !closing) action("drag").catch(error);
  });
  document.addEventListener("contextmenu", event => {
    if (event.target !== field) event.preventDefault();
  });
  window.__NUTBOOK_QUICK_NUT_OPEN__ = open;
  window.__NUTBOOK_QUICK_NUT_CLOSE__ = dismiss;
  render();
  invoke("quick_nut_generation").then(session => {
    if (session > generation) return open(session);
  }).catch(error);
})();
