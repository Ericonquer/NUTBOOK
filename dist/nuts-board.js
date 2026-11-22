window.NutbookNutsBoard = function ({ invoke, copy, confirm, report, refreshIssues, onBoardChange, onCardRemoved, imageUsageButton }) {
  const page = document.getElementById("nutsBoardPage");
  const visible = () => !page.hidden && !page.parentElement.hidden;
  const board = document.getElementById("nutsBoard");
  const viewport = document.getElementById("nutsBoardViewport");
  const formPanel = document.getElementById("nutsFormPanel");
  const form = document.getElementById("nutsBoardForm");
  const field = document.getElementById("nutsBoardInput");
  const submit = document.getElementById("nutsBoardSubmit");
  const marquee = document.getElementById("nutsMarquee");
  const groupLayer = document.getElementById("nutsGroupLayer");
  const cardLayer = document.getElementById("nutsCardLayer");
  const makeIssue = document.getElementById("nutsMakeIssue");
  const zoom = document.getElementById("nutsZoom");
  const pan = document.getElementById("nutsPan");
  const boardList = document.getElementById("nutsBoardList");
  const boardDialog = document.getElementById("nutsNewBoardDialog");
  const boardForm = document.getElementById("nutsNewBoardForm");
  const boardName = document.getElementById("nutsNewBoardName");
  const boardError = document.getElementById("nutsNewBoardError");
  const createBoard = document.getElementById("nutsNewBoardSubmit");
  const sceneSelect = window.NutbookNutsPicker("nutsSceneSelect", "nutsSceneLabel", applyScene);
  const sceneAbout = document.getElementById("nutsSceneAbout");
  const rulesDialog = document.getElementById("nutsRulesDialog");
  const ruleName = document.getElementById("nutsRuleName");
  const ruleText = document.getElementById("nutsRuleText");
  const ruleGoal = document.getElementById("nutsRuleGoal");
  const ruleTemplate = window.NutbookNutsPicker("nutsRuleTemplate", "nutsRuleTemplateLabel");
  const ruleTemplates = document.getElementById("nutsRuleTemplates");
  const ruleTemplateToggle = document.getElementById("nutsRuleTemplatesTitle");
  const saveRules = document.getElementById("nutsSaveRules");
  const rulesError = document.getElementById("nutsRulesError");
  const issueFields = document.getElementById("nutsIssueTemplateFields");
  const issueTemplate = window.NutbookNutsPicker("nutsIssueTemplate", "nutsIssueTemplateLabel", applyIssueTemplate);
  const issueGoal = document.getElementById("nutsIssueGoal");
  const captureBoard = window.NutbookNutsPicker("nutsCaptureBoard", "nutsCaptureDestinationLabel");
  const captureDestination = document.getElementById("nutsCaptureDestination");
  const catalogRequests = new Map();
  let rulesSession;
  function getCatalog() {
    const language = copy("zh-CN", "en-US");
    if (!catalogRequests.has(language)) {
      catalogRequests.set(language, invoke("nuts_scene_catalog", { language }).catch(error => {
        catalogRequests.delete(language);
        throw error;
      }));
    }
    return catalogRequests.get(language);
  }
  let boardId = "default";
  let boardChoices = [];
  const selected = new Set();
  const cards = new Map();
  let gesture, editor, suppressClick, loading = 0;
  let savingGroup = false;
  let scale = 1;
  let cameraX = 0, cameraY = 0;
  let captureDraft = "";
  let spaceDown = false;
  let dropSubscription;
  let dropTarget = Promise.resolve();

  function button(id, label) {
    const element = document.getElementById(id);
    if (element.classList.contains("nuts-tool-icon")) {
      element.setAttribute("aria-label", label);
      element.dataset.tooltip = label;
      element.removeAttribute("title");
    } else {
      element.textContent = label;
      element.title = label;
    }
  }

  const previewAttempts = new Set();
  let previewRunning = false;

  async function refreshPreviews() {
    if (previewRunning) return;
    previewRunning = true;
    try {
      while (visible()) {
        const next = [...cards.values()].find(card =>
          card.kind === "link" && !card.preview_ready && !previewAttempts.has(card.id));
        if (!next) break;
        previewAttempts.add(next.id);
        const updated = await invoke("nuts_refresh_link_preview", { cardId: next.id }).catch(() => false);
        if (updated && visible() && !gesture) await reload();
      }
    } finally {
      previewRunning = false;
    }
  }

  const imageKinds = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
  const thumbnails = new Map();
  let thumbnailsRunning = false;

  const cardWidth = card => card.width ?? 220;
  const cardHeight = card => card.height ?? 116;

  async function fetchThumbnail(cardId) {
    const src = await invoke("nuts_image_thumbnail", { cardId });
    const image = new Image();
    image.src = src;
    await image.decode();
    const scale = Math.min(1, 440 / image.naturalWidth, 480 / image.naturalHeight);
    return {
      src,
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
      height: Math.max(1, Math.round(image.naturalHeight * scale)),
    };
  }

  function showThumbnail(card, preview) {
    if (!preview) return;
    let image = card.node.querySelector(".nuts-image-thumbnail");
    if (!image) {
      image = document.createElement("img");
      image.className = "nuts-image-thumbnail";
      image.alt = "";
      image.draggable = false;
      image.src = preview.src;
      card.node.prepend(image);
    }
    const scale = (card.image_scale ?? 100) / 100;
    image.width = Math.max(1, Math.round(preview.width * scale));
    image.height = Math.max(1, Math.round(preview.height * scale));
    card.width = Math.max(144, image.width + 12);
    card.height = image.height + 42;
    card.node.style.width = `${card.width}px`;
    card.node.style.height = `${card.height}px`;
    card.node.classList.add("has-image-thumbnail");
    card.resizeHandle.hidden = false;
    position(card, card.x, card.y);
  }

  function imageResizeHandle(card) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "nuts-tool-icon nuts-image-resize";
    handle.hidden = true;
    handle.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m5 15 10-10m-6 11 7-7m-3 7 3-3"/></svg>';
    const label = copy("缩放图片", "Resize image");
    handle.setAttribute("aria-label", label);
    handle.dataset.tooltip = label;
    const destination = boardId;
    let drag;
    let saving = false;

    function resize(current, percent) {
      current.image_scale = percent;
      showThumbnail(current, thumbnails.get(current.id));
      if (current.issue_id) renderGroups();
    }

    async function save(previous) {
      const percent = card.image_scale;
      if (percent === previous || cards.get(card.id) !== card) return;
      saving = true;
      try {
        await invoke("nuts_image_usage", { boardId: destination, cardId: card.id, issueId: card.issue_id, scale: percent });
        const current = cards.get(card.id);
        if (boardId === destination && current && current !== card) resize(current, percent);
      } catch (error) {
        if (cards.get(card.id) === card) resize(card, previous);
        report(error);
      } finally {
        saving = false;
      }
    }

    handle.addEventListener("pointerdown", event => {
      event.stopPropagation();
      const preview = thumbnails.get(card.id);
      if (event.button !== 0 || saving || drag || gesture || !preview) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      drag = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        percent: card.image_scale ?? 100, zoom: scale,
        width: preview.width, height: preview.height,
      };
      handle.classList.add("is-resizing");
      handle.dataset.tooltip = `${label} · ${drag.percent}%`;
    });
    handle.addEventListener("pointermove", event => {
      if (drag?.id !== event.pointerId) return;
      event.stopPropagation();
      const dx = (event.clientX - drag.x) / drag.zoom;
      const dy = (event.clientY - drag.y) / drag.zoom;
      const delta = (dx * drag.width + dy * drag.height) / (drag.width ** 2 + drag.height ** 2);
      resize(card, Math.min(150, Math.max(25, Math.round(drag.percent + 100 * delta))));
      handle.dataset.tooltip = `${label} · ${card.image_scale}%`;
    });
    const finishResize = event => {
      if (drag?.id !== event.pointerId) return;
      event.stopPropagation();
      const { percent } = drag;
      drag = undefined;
      handle.classList.remove("is-resizing");
      handle.dataset.tooltip = label;
      if (event.type === "pointerup") void save(percent);
      else if (cards.get(card.id) === card) resize(card, percent);
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      handle.addEventListener(type, finishResize);
    }
    for (const type of ["click", "dblclick"]) {
      handle.addEventListener(type, event => event.stopPropagation());
    }
    handle.addEventListener("keydown", event => {
      const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
      if (!(event.key in steps)) return;
      event.preventDefault();
      event.stopPropagation();
      if (saving || drag || !thumbnails.get(card.id)) return;
      const previous = card.image_scale ?? 100;
      resize(card, Math.min(150, Math.max(25, previous + steps[event.key] * 5)));
      handle.dataset.tooltip = `${label} · ${card.image_scale}%`;
      void save(previous);
    });
    return handle;
  }

  async function loadThumbnails() {
    if (thumbnailsRunning) return;
    thumbnailsRunning = true;
    try {
      while (visible()) {
        const card = [...cards.values()].find(card =>
          imageKinds.has(card.kind) && !thumbnails.has(card.id));
        if (!card) break;
        const preview = await fetchThumbnail(card.id).catch(() => null);
        const current = cards.get(card.id);
        if (current) {
          thumbnails.set(card.id, preview);
          showThumbnail(current, preview);
          if (preview && current.issue_id) renderGroups();
        }
      }
    } finally {
      thumbnailsRunning = false;
    }
  }

  let removalPending = false;
  document.getElementById("nutsRemoveSelection").addEventListener("click", () => {
    confirmRemoval(boardId, [...selected]);
  });

  async function confirmRemoval(destination, cardIds, issueId = null) {
    if (removalPending || !cardIds.length) return;
    removalPending = true;
    try {
      const confirmed = await confirm({
        title: copy("移除卡片", "Remove cards"),
        message: issueId
          ? copy("确定从白板和议题素材中移除这张卡片？", "Remove this card from the board and issue materials?")
          : cardIds.length === 1
          ? copy("确定从白板移除这张卡片？", "Remove this card from the board?")
          : copy(
            `确定从白板移除选中的 ${cardIds.length} 张卡片？`,
            `Remove the ${cardIds.length} selected cards from this board?`),
        note: copy("此操作无法撤销。", "This cannot be undone."),
        cancelText: copy("取消", "Cancel"),
        confirmText: copy("移除卡片", "Remove cards"),
      });
      if (!confirmed) return;
      await invoke("nuts_remove_board_cards", { boardId: destination, cardIds, issueId });
      if (visible() && boardId === destination) {
        for (const id of cardIds) selected.delete(id);
        await reload();
        viewport.focus({ preventScroll: true });
      }
      await onCardRemoved();
    } catch (error) {
      report(error);
    } finally {
      removalPending = false;
    }
  }

  function paintSelection() {
    makeIssue.disabled = selected.size === 0 || Boolean(editor);
    document.getElementById("nutsSelection").hidden = makeIssue.disabled;
    document.getElementById("nutsSelectedCount").textContent = copy(`已选 ${selected.size} 张卡片`, `${selected.size} selected`);
    button("nutsMakeIssue", copy("创建议题", "Create issue"));
    button("nutsRemoveSelection", copy("移除卡片", "Remove cards"));
    button("nutsClearSelection", copy("取消选择", "Clear selection"));
    for (const card of cards.values()) card.node.setAttribute("aria-pressed", selected.has(card.id));
  }

  document.getElementById("nutsClearSelection").addEventListener("click", () => {
    selected.clear();
    paintSelection();
    viewport.focus({ preventScroll: true });
  });

  function renderGroups() {
    const groups = new Map();
    for (const card of cards.values()) {
      if (!card.issue_id) continue;
      if (!groups.has(card.issue_id)) groups.set(card.issue_id, []);
      groups.get(card.issue_id).push(card);
    }
    for (const [id, members] of groups) {
      let frame = groupLayer.querySelector(`[data-issue-id="${id}"]`);
      if (!frame) {
        frame = document.createElement("div");
        frame.className = "nuts-group";
        frame.dataset.issueId = id;
        const title = document.createElement("button");
        title.type = "button";
        title.textContent = members[0].issue_title;
        title.title = copy(`打开议题「${title.textContent}」`, `Open issue: ${title.textContent}`);
        title.addEventListener("click", event => {
          if ((!suppressClick && !viewport.classList.contains("is-panning")) || event.detail === 0) refreshIssues(id).catch(report);
        });
        frame.append(title);
        groupLayer.append(frame);
      }
      const left = Math.min(...members.map(card => card.x)) - 10;
      const top = Math.min(...members.map(card => card.y)) - 30;
      const right = Math.max(...members.map(card => card.x + cardWidth(card))) + 10;
      const bottom = Math.max(...members.map(card => card.y + cardHeight(card))) + 10;
      Object.assign(frame.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    }
  }

  function position(card, x, y) {
    card.x = Math.round(x);
    card.y = Math.round(y);
    card.node.style.left = `${card.x}px`;
    card.node.style.top = `${card.y}px`;
    if (card.usageButton) {
      card.usageButton.style.left = `${card.x + cardWidth(card) - (card.node.classList.contains("has-image-thumbnail") ? 48 : 34)}px`;
      const usageTop = card.node.classList.contains("has-image-thumbnail") ? cardHeight(card) - 34 : 5;
      card.usageButton.style.top = `${card.y + usageTop}px`;
    }
    if (card.resizeHandle) {
      card.resizeHandle.style.left = `${card.x + cardWidth(card) - 21}px`;
      card.resizeHandle.style.top = `${card.y + cardHeight(card) - 21}px`;
    }
  }

  async function reload() {
    const request = ++loading;
    const rows = await invoke("nuts_board_cards", { boardId });
    if (request !== loading || !visible()) return;
    cards.clear();
    cardLayer.replaceChildren();
    groupLayer.replaceChildren();
    for (const card of rows) {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "nuts-card";
      node.dataset.cardId = card.id;
      node.title = card.issue_title ? `${card.title} · ${card.issue_title}` : card.title;
      const caption = document.createElement("span");
      caption.className = "nuts-card-caption";
      caption.textContent = card.kind === "link" ? copy("链接", "Link") : card.kind === "note" ? "NUT" : card.kind === "markdown" ? "Markdown" : card.kind.toUpperCase();
      const title = document.createElement("strong");
      title.className = "nuts-card-title";
      title.textContent = card.title;
      const excerpt = document.createElement("span");
      excerpt.className = "nuts-card-copy";
      excerpt.textContent = card.kind === "note" ? card.excerpt.split("\n").slice(1).join("\n") : card.excerpt;
      node.append(caption, title);
      if (card.preview_image) {
        const image = document.createElement("img");
        image.className = "nuts-link-cover";
        image.alt = "";
        image.draggable = false;
        image.src = card.preview_image;
        node.classList.add("has-link-cover");
        node.append(image);
      }
      if (["note", "markdown", "link"].includes(card.kind)) node.append(excerpt);
      card.node = node;
      if (imageKinds.has(card.kind)) {
        node.classList.add("nuts-image-card");
        node.setAttribute("aria-label", node.title);
        const usage = imageUsageButton(card, boardId, card.issue_id);
        usage.classList.add("nuts-card-image-usage", "nuts-tool-icon");
        for (const type of ["pointerdown", "click", "dblclick"]) {
          usage.addEventListener(type, event => event.stopPropagation());
        }
        card.usageButton = usage;
        card.resizeHandle = imageResizeHandle(card);
        card.resizeHandle.dataset.cardId = card.id;
      }
      showThumbnail(card, thumbnails.get(card.id));
      position(card, card.x, card.y);
      cards.set(card.id, card);
      cardLayer.append(node);
      if (card.usageButton) cardLayer.append(card.usageButton, card.resizeHandle);
    }
    for (const id of selected) if (!cards.has(id) || cards.get(id).issue_id) selected.delete(id);
    for (const id of thumbnails.keys()) if (!cards.has(id)) thumbnails.delete(id);
    void loadThumbnails().catch(report);
    void refreshPreviews().catch(report);
    renderGroups();
    paintSelection();
  }

  function origin() {
    const index = cards.size;
    return {
      x: Math.round((24 - cameraX) / scale) + (index % 4) * 24,
      y: Math.round((52 - cameraY) / scale) + (index % 4) * 24,
    };
  }

  async function addPaths(paths, destination = boardId, target = origin()) {
    const failures = [];
    try {
      for (const [offset, path] of paths.entries()) {
        try { await invoke("nuts_board_file", { boardId: destination, path, x: target.x + offset * 22, y: target.y + offset * 22 }); }
        catch (error) { failures.push(String(error)); }
      }
      await reload();
      if (failures.length) report(failures.join(" · "));
    } catch (error) { report(error); }
  }

  function animateCapture(start, title) {
    if (!visible() || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = document.querySelector("#nutsDrawerButtons button")?.getBoundingClientRect();
    if (!target?.width) return;
    const flight = document.createElement("div");
    flight.className = "nuts-capture-flight";
    flight.setAttribute("aria-hidden", "true");
    const mascot = document.querySelector("#nutsNewNote .nuts-mascot").cloneNode();
    const paper = document.createElement("span");
    paper.className = "nuts-flight-paper";
    paper.textContent = title;
    flight.append(mascot, paper);
    document.body.append(flight);
    const at = (rect, scale) => `translate(${rect.left + rect.width / 2 - 18}px,${rect.top + rect.height / 2 - 18}px) scale(${scale})`;
    paper.animate([
      { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
      { opacity: 0, transform: "translate(-50%,-50%) scale(.08)" },
    ], { duration: 150, fill: "forwards" });
    const motion = flight.animate([
      { transform: at(start, 1), opacity: 1 },
      { transform: at(start, .86), opacity: 1, offset: .34 },
      { transform: at(target, .32), opacity: 0 },
    ], { duration: 390, easing: "cubic-bezier(.22,.75,.25,1)" });
    motion.finished.then(() => flight.remove(), () => flight.remove());
  }

  function openForm(kind, point = origin(), destination = boardId) {
    if (editor) return;
    editor = { kind, point, boardId: destination, ids: [...selected], ready: kind === "note" };
    issueFields.hidden = kind !== "issue";
    captureDestination.hidden = kind !== "note";
    if (kind === "note") {
      const choices = boardChoices.length ? boardChoices : [{ id: "default" }];
      captureBoard.setOptions(choices.map(choice => ({
        value: choice.id,
        label: choice.id === "default" ? copy("随手记", "Quick notes") : choice.name,
      })), destination);
      document.getElementById("nutsCaptureDestinationLabel").textContent = copy("收进白板", "Save to board");
    }
    issueTemplate.setOptions([]);
    issueGoal.value = "";
    document.getElementById("nutsIssueRuleHint").textContent = "";
    if (kind === "issue") prepareIssueFields(editor);

    formPanel.dataset.kind = kind;
    const shortcut = document.getElementById("nutsCaptureShortcut");
    shortcut.hidden = kind !== "note";
    shortcut.textContent = navigator.platform.includes("Mac") ? "⌘↵" : "Ctrl+Enter";
    field.value = kind === "note" ? captureDraft : "";
    field.placeholder = kind === "note" ? copy("我刚想到……", "I just thought of…") : "";
    document.getElementById("nutsCaptureError").textContent = "";
    field.rows = kind === "note" ? 3 : 1;
    document.getElementById("nutsBoardInputLabel").textContent = kind === "note" ? copy("写下一条 NUT", "Write a NUT") : copy("议题名称", "Issue title");
    button("nutsBoardSubmit", kind === "note" ? copy("收下 NUT", "Save NUT") : copy("创建议题", "Create issue"));
    button("nutsBoardCancel", copy("取消", "Cancel"));
    paintSelection();
    formPanel.showModal();
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }

  async function prepareIssueFields(session) {
    try {
      const [catalog, config] = await Promise.all([getCatalog(), invoke("nuts_board_config", { boardId: session.boardId })]);
      if (editor !== session) return;
      const scenario = catalog.scenes.find(scene => scene.id === config.scene);
      issueTemplate.setOptions([
        { value: "", label: copy("自定义议题", "Custom issue") },
        ...scenario.tasks.map(task => ({ value: task.key || task.name, label: task.name, goal: task.goal })),
      ]);
      document.getElementById("nutsIssueRuleHint").textContent = copy(
        `使用「${config.rules.name}」的白板规则`, `Uses board rules: ${config.rules.name}`);
      session.ready = true;
    } catch (error) {
      if (editor === session) document.getElementById("nutsCaptureError").textContent = String(error);
    }
  }
  function applyIssueTemplate(option) {
    if (option.goal) issueGoal.value = option.goal;
  }

  function closeForm() {
    editor = null;
    if (formPanel.open) formPanel.close();
    paintSelection();
  }

  document.getElementById("nutsBoardCancel").onclick = closeForm;
  formPanel.addEventListener("cancel", event => {
    event.preventDefault();
    if (!submit.disabled) closeForm();
  });
  field.addEventListener("input", () => { if (editor?.kind === "note") captureDraft = field.value; });
  field.addEventListener("keydown", event => {
    if (!event.isComposing && event.keyCode !== 229 && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.getElementById("nutsNewNote").onclick = () => openForm("note");
  makeIssue.onclick = () => openForm("issue");
  async function chooseMaterials(destination = boardId, target = origin()) {
    try {
      const paths = await invoke("nuts_choose_materials", { language: copy("zh-CN", "en-US") });
      if (paths?.length) await addPaths(paths, destination, target);
    } catch (error) { report(error); }
  }
  document.getElementById("nutsAddMarkdown").onclick = () => chooseMaterials();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!editor?.ready || submit.disabled) return;
    const input = field.value.trim();
    if (!input) { field.focus(); return; }
    submit.disabled = true;
    try {
      if (editor.kind === "note") {
        const start = field.getBoundingClientRect();
        const destination = captureBoard.value || editor.boardId;
        const position = destination === boardId ? editor.point : { x: 30, y: 52 };
        await invoke("nuts_board_note", { boardId: destination, markdown: input, ...position });
        captureDraft = "";
        closeForm();
        if (destination === boardId) {
          animateCapture(start, input.split("\n")[0]);
          await reload();
        } else {
          report(copy("NUT 已保存到所选白板。", "NUT saved to the selected board."));
        }
        return;
      } else {
        const id = await invoke("nuts_board_issue", { boardId: editor.boardId, title: input, cardIds: editor.ids, template: issueTemplate.value || null, goal: issueGoal.value });
        selected.clear();
        closeForm();
        await refreshIssues(id);
        return;
      }
    } catch (error) {
      document.getElementById("nutsCaptureError").textContent = String(error);
    }
    finally { submit.disabled = false; }
  });

  function point(event) {
    const bounds = board.getBoundingClientRect();
    return { x: Math.round((event.clientX - bounds.left) / scale), y: Math.round((event.clientY - bounds.top) / scale) };
  }

  function paintPan() { viewport.classList.toggle("is-panning", spaceDown || pan.getAttribute("aria-pressed") === "true"); }
  function togglePan() {
    const enabled = pan.getAttribute("aria-pressed") !== "true";
    pan.setAttribute("aria-pressed", enabled);
    pan.dataset.tooltip = enabled
      ? copy("平移已开启 · 按住画布拖动", "Pan enabled · Drag the canvas")
      : copy("拖动画布", "Pan canvas");
    paintPan();
  }
  pan.onclick = togglePan;
  document.addEventListener("keydown", event => {
    if (visible() && event.code === "Space" && (event.target === board || event.target === viewport)) {
      event.preventDefault();
      spaceDown = true;
      paintPan();
    }
  });
  window.addEventListener("keyup", event => { if (event.code === "Space") { spaceDown = false; paintPan(); } });
  function paintCamera() {
    board.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${scale})`;
    viewport.style.backgroundSize = `${20 * scale}px ${20 * scale}px`;
    viewport.style.backgroundPosition = `${cameraX}px ${cameraY}px`;
  }

  function setZoom(next) {
    scale = Math.min(2, Math.max(.35, next));
    paintCamera();
    zoom.textContent = `${Math.round(scale * 100)}%`;
    document.getElementById("nutsZoomOut").disabled = scale <= .35;
    document.getElementById("nutsZoomIn").disabled = scale >= 2;
  }
  function zoomAt(next, clientX, clientY) {
    const before = board.getBoundingClientRect();
    const x = (clientX - before.left) / scale;
    const y = (clientY - before.top) / scale;
    setZoom(next);
    cameraX += (clientX - before.left) - x * scale;
    cameraY += (clientY - before.top) - y * scale;
    paintCamera();
  }
  function zoomFromCenter(change) {
    const bounds = viewport.getBoundingClientRect();
    zoomAt(Math.round((scale + change) * 100) / 100,
      bounds.left + viewport.clientWidth / 2, bounds.top + viewport.clientHeight / 2);
  }
  document.getElementById("nutsZoomOut").onclick = () => zoomFromCenter(-.15);
  document.getElementById("nutsZoomIn").onclick = () => zoomFromCenter(.15);
  viewport.addEventListener("wheel", event => {
    event.preventDefault();
    if (gesture || editor) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    if (event.ctrlKey || event.metaKey) {
      zoomAt(scale * Math.exp(-event.deltaY * unit * .006), event.clientX, event.clientY);
    } else {
      cameraX -= event.deltaX * unit;
      cameraY -= event.deltaY * unit;
      paintCamera();
    }
  }, { passive: false });
  document.getElementById("nutsZoomFit").onclick = () => {
    const entries = [...cards.values()];
    if (!entries.length) { cameraX = cameraY = 0; setZoom(1); return; }
    const left = Math.min(...entries.map(card => card.x)) - 16;
    const top = Math.min(...entries.map(card => card.y)) - 32;
    const right = Math.max(...entries.map(card => card.x + cardWidth(card))) + 16;
    const bottom = Math.max(...entries.map(card => card.y + cardHeight(card))) + 16;
    setZoom(Math.min(1, (viewport.clientWidth - 24) / (right - left), (viewport.clientHeight - 52) / (bottom - top)));
    cameraX = (viewport.clientWidth - (right - left) * scale) / 2 - left * scale;
    cameraY = (viewport.clientHeight - (bottom - top) * scale) / 2 - top * scale;
    paintCamera();
  };

  function renderBoardList() {
    boardList.replaceChildren();
    for (const choice of boardChoices) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.id === "default" ? copy("随手记", "Quick notes") : choice.name;
      button.title = button.textContent;
      if (choice.id === boardId) button.setAttribute("aria-current", "page");
      button.onclick = () => switchBoard(choice.id).catch(report);
      boardList.append(button);
    }
  }

  async function switchBoard(id) {
    if (id === boardId) return;
    boardId = id;
    gesture = null;
    marquee.hidden = true;
    selected.clear();
    cards.clear();
    cardLayer.replaceChildren();
    groupLayer.replaceChildren();
    cameraX = cameraY = 0;
    setZoom(1);
    paintSelection();
    renderBoardList();
    onBoardChange();
    await reload();
  }
  let defaultSceneName = "";
  function applyScene(option) {
    if (!option) return;
    if (!boardName.value || boardName.value === defaultSceneName) boardName.value = option.label;
    defaultSceneName = option.label;
    sceneAbout.textContent = option.about;
  }
  document.getElementById("nutsNewBoard").onclick = async () => {
    const current = boardId;
    try {
      const catalog = await getCatalog();
      if (!visible() || boardId !== current || boardDialog.open) return;
      boardForm.reset();
      boardError.textContent = "";
      sceneSelect.setOptions(catalog.scenes.map(scene => ({ value: scene.id, label: scene.name, about: scene.about })));
      applyScene(sceneSelect.selected);
      boardDialog.showModal();
      boardName.focus();
    } catch (error) { report(error); }
  };

  document.getElementById("nutsBoardRules").onclick = async () => {
    const current = boardId;
    try {
      const [catalog, config] = await Promise.all([getCatalog(), invoke("nuts_board_config", { boardId: current })]);
      if (!visible() || boardId !== current || rulesDialog.open) return;
      rulesSession = { boardId: current, version: config.rules.version, templates: catalog.ruleTemplates };
      ruleName.value = config.rules.name;
      ruleText.value = config.rules.text;
      ruleGoal.value = "";
      showRuleTemplates(false);
      rulesError.textContent = "";
      ruleTemplate.setOptions(catalog.ruleTemplates.map(item => ({ label: item.name, value: item.id })));
      rulesDialog.showModal();
      ruleText.focus();
    } catch (error) { report(error); }
  };
  function showRuleTemplates(open) {
    ruleTemplates.hidden = !open;
    ruleTemplateToggle.setAttribute("aria-expanded", String(open));
  }
  ruleTemplateToggle.onclick = () => showRuleTemplates(ruleTemplates.hidden);
  document.getElementById("nutsDraftRule").onclick = () => {
    const template = rulesSession?.templates.find(item => item.id === ruleTemplate.value);
    if (!template) return;
    ruleName.value = template.name;
    ruleText.value = [copy("# 白板工作规则", "# Board rules"), ruleGoal.value.trim(), copy("## 工作步骤", "## Workflow"),
      template.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")].filter(Boolean).join("\n\n");
    showRuleTemplates(false);
    ruleText.focus();
  };
  document.getElementById("nutsRulesCancel").onclick = () => { if (!saveRules.disabled) rulesDialog.close(); };
  rulesDialog.addEventListener("cancel", event => { if (saveRules.disabled) event.preventDefault(); });
  document.getElementById("nutsRulesForm").onsubmit = async event => {
    event.preventDefault();
    if (!rulesSession || saveRules.disabled) return;
    saveRules.disabled = true;
    rulesError.textContent = "";
    try {
      await invoke("nuts_save_rules", { boardId: rulesSession.boardId, expected: rulesSession.version, name: ruleName.value, text: ruleText.value });
      rulesDialog.close();
    } catch (error) { rulesError.textContent = String(error); }
    finally { saveRules.disabled = false; }
  };
  document.getElementById("nutsNewBoardCancel").onclick = () => boardDialog.close();
  boardDialog.addEventListener("cancel", event => { if (createBoard.disabled) event.preventDefault(); });
  boardForm.onsubmit = async event => {
    event.preventDefault();
    if (createBoard.disabled) return;
    const name = boardName.value.trim();
    if (!name) { boardName.focus(); return; }
    createBoard.disabled = true;
    try {
      const id = await invoke("nuts_create_board", { name, scene: sceneSelect.value });
      boardChoices.push({ id, name });
      boardDialog.close();
      await switchBoard(id);
    } catch (error) {
      if (boardDialog.open) boardError.textContent = String(error);
      else report(error);
    } finally { createBoard.disabled = false; }
  };

  viewport.addEventListener("dblclick", event => {
    if (viewport.classList.contains("is-panning")) return;
    const card = cards.get(event.target.closest(".nuts-card")?.dataset.cardId);
    if (card?.kind === "link") {
      invoke("open_external_url_command", { payload: { url: card.url || card.excerpt } }).catch(report);
    } else if (!event.target.closest(".nuts-card, .nuts-group")) openForm("note", point(event));
  });
  document.addEventListener("paste", event => {
    if (!visible() || page.parentElement.querySelector("dialog[open]") || event.target.closest?.("input, textarea, [contenteditable=true]")) return;
    const clipboard = event.clipboardData;
    const supportsImage = type => /^image\/(png|jpeg|gif|webp)$/.test(type);
    const image = [...(clipboard?.files || [])].find(file => supportsImage(file.type))
      || [...(clipboard?.items || [])].find(item => item.kind === "file" && supportsImage(item.type))?.getAsFile();
    const text = clipboard?.getData("text/plain").trim();
    const isWebUrl = value => /^https?:\/\/[^\s]+$/i.test(value || "");
    const webUrl = isWebUrl(text);
    let imageUrl = webUrl && /\.(png|jpe?g|gif|webp)$/i.test(text.split(/[?#]/, 1)[0]) ? text : "";
    const html = clipboard?.getData("text/html");
    if (!image && !imageUrl && html && html.length <= 64 * 1024) {
      const template = document.createElement("template");
      template.innerHTML = html;
      const images = template.content.querySelectorAll("img");
      const src = images[0]?.getAttribute("src");
      if (images.length === 1 && !template.content.textContent.trim() && isWebUrl(src)) imageUrl = src;
    }
    if (!image && !imageUrl && !webUrl) return;
    event.preventDefault();
    const destination = boardId;
    const at = origin();
    const add = async () => {
      if (image || imageUrl) {
        if (image?.size > 10 * 1024 * 1024) throw new Error(copy("图片超过 10 MB", "Image exceeds 10 MB"));
        const data = image ? await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(image);
        }) : imageUrl;
        await invoke("nuts_paste_image", { boardId: destination, data, ...at });
      } else {
        await invoke("nuts_board_link", { boardId: destination, text, ...at });
      }
      if (visible() && boardId === destination) await reload();
    };
    add().catch(report);
  });
  viewport.addEventListener("click", event => {
    if (suppressClick) { suppressClick = false; return; }
    if (viewport.classList.contains("is-panning") && event.detail !== 0) return;
    const id = event.target.closest(".nuts-card")?.dataset.cardId;
    if (event.target.closest(".nuts-group") || cards.get(id)?.issue_id) return;
    if (id) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
    } else selected.clear();
    paintSelection();
  });
  viewport.addEventListener("pointerdown", event => {
    if (savingGroup || (event.button !== 0 && event.button !== 1)) return;
    suppressClick = false;
    const card = cards.get(event.target.closest(".nuts-card")?.dataset.cardId);
    const panning = event.button === 1 || viewport.classList.contains("is-panning");
    const issueId = !card && !panning ? event.target.closest(".nuts-group")?.dataset.issueId : undefined;
    const members = issueId ? [...cards.values()].filter(member => member.issue_id === issueId)
      .map(member => ({ card: member, x: member.x, y: member.y })) : [];
    gesture = { id: event.pointerId, start: point(event), clientX: event.clientX, clientY: event.clientY,
      left: cameraX, top: cameraY, card, panning, additive: event.shiftKey,
      x: card?.x, y: card?.y, moved: false, issueId, members };
    if (panning) event.preventDefault();
  });
  viewport.addEventListener("pointermove", event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.clientX;
    const dy = event.clientY - gesture.clientY;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    if (!gesture.moved) viewport.setPointerCapture(event.pointerId);
    gesture.moved = true;
    if (gesture.panning) {
      viewport.classList.add("is-dragging-canvas");
      cameraX = gesture.left + dx;
      cameraY = gesture.top + dy;
      paintCamera();
      return;
    }
    const end = point(event), start = gesture.start;
    if (gesture.members.length) {
      const members = gesture.members;
      gesture.dx = end.x - start.x;
      gesture.dy = end.y - start.y;
      for (const member of members) position(member.card, member.x + gesture.dx, member.y + gesture.dy);
      renderGroups();
      return;
    }
    if (gesture.card) {
      markDropIssue(gesture, event);
      position(gesture.card, gesture.x + end.x - start.x, gesture.y + end.y - start.y);
      if (gesture.card.issue_id) renderGroups();
      return;
    }
    const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
    const right = Math.max(start.x, end.x), bottom = Math.max(start.y, end.y);
    gesture.bounds = { x, y, right, bottom };
    Object.assign(marquee.style, { left: `${x}px`, top: `${y}px`, width: `${right - x}px`, height: `${bottom - y}px` });
    marquee.hidden = false;
  });

  function markDropIssue(current, event) {
    const frames = [...groupLayer.children];
    for (const frame of frames) frame.classList.remove("nuts-group-drop");
    current.dropIssue = undefined;
    if (!current.card || current.card.issue_id || current.panning) return;
    for (const frame of frames.reverse()) {
      const bounds = frame.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) continue;
      current.dropIssue = frame.dataset.issueId;
      frame.classList.add("nuts-group-drop");
      break;
    }
  }

  function restoreGesture(current) {
    if (!current?.moved || current.panning) return;
    if (current.card) position(current.card, current.x, current.y);
    for (const member of current.members) position(member.card, member.x, member.y);
    renderGroups();
  }

  async function finish(event, cancelled) {
    if (gesture?.id !== event.pointerId) return;
    const current = gesture;
    gesture = null;
    viewport.classList.remove("is-dragging-canvas");
    marquee.hidden = true;
    groupLayer.querySelector(".nuts-group-drop")?.classList.remove("nuts-group-drop");
    if (!current.moved) return;
    suppressClick = true;
    if (cancelled) { restoreGesture(current); return; }
    if (current.members.length) {
      if (!current.dx && !current.dy) return;
      savingGroup = true;
      try {
        await invoke("nuts_board_move_group", { issueId: current.issueId, dx: current.dx, dy: current.dy });
      } catch (error) {
        if (cards.get(current.members[0].card.id) === current.members[0].card) restoreGesture(current);
        report(error);
      } finally { savingGroup = false; }
    } else if (current.card && !current.panning) {
      const card = current.card;
      try {
        if (current.dropIssue) {
          await invoke("nuts_board_attach_card", { boardId, issueId: current.dropIssue, cardId: card.id, x: card.x, y: card.y });
          await reload();
        } else await invoke("nuts_board_move", { id: card.id, x: card.x, y: card.y });
      }
      catch (error) { position(card, current.x, current.y); renderGroups(); report(error); }
    } else if (!current.panning && current.bounds) {
      const box = current.bounds;
      if (!current.additive) selected.clear();
      for (const card of cards.values()) {
        if (!card.issue_id && card.x < box.right && card.x + cardWidth(card) > box.x && card.y < box.bottom && card.y + cardHeight(card) > box.y) selected.add(card.id);
      }
      paintSelection();
    }
  }
  window.addEventListener("pointerup", event => finish(event, false));
  window.addEventListener("pointercancel", event => finish(event, true));
  window.addEventListener("blur", () => { spaceDown = false; paintPan(); });

  return {
    contextMenu(target, event) {
      const destination = boardId;
      const at = event.detail === 0 && !event.clientX && !event.clientY ? origin() : point(event);
      const card = cards.get(target.closest(".nuts-card, .nuts-image-resize")?.dataset.cardId);
      const issueId = card?.issue_id || target.closest(".nuts-group")?.dataset.issueId;
      return {
        kind: card?.issue_id ? "nuts-issue-card" : issueId ? "nuts-issue-group" : card ? "nuts-board-card" : "nuts-board",
        async run(action) {
          if (!visible() || boardId !== destination) return;
          if (action === "nuts-note") openForm("note", at, destination);
          if (action === "nuts-material") await chooseMaterials(destination, at);
          if (action === "nuts-fit") document.getElementById("nutsZoomFit").click();
          if (action === "nuts-remove-card" && card) await confirmRemoval(destination, [card.id], card.issue_id);
          if (action === "nuts-open-issue" && issueId) await refreshIssues(issueId);
        },
      };
    },
    confirmRemoval,
    current: () => boardId,
    switchBoard,
    nameFor: id => id === "default" ? copy("随手记", "Quick notes") : boardChoices.find(choice => choice.id === id)?.name,
    async capture(destination = boardId) {
      if (!visible() || boardDialog.open || rulesDialog.open) return;
      if (!boardChoices.length) boardChoices = await invoke("nuts_boards");
      if (visible()) openForm("note", destination === boardId ? origin() : { x: 30, y: 52 }, destination);
    },
    async locate(id) {
      if (!cards.has(id)) await reload();
      const card = cards.get(id);
      if (!card) return;
      cameraX = (viewport.clientWidth - cardWidth(card) * scale) / 2 - card.x * scale;
      cameraY = (viewport.clientHeight - cardHeight(card) * scale) / 2 - card.y * scale;
      paintCamera();
      card.node.focus({ preventScroll: true });
    },
    localize,
    async open(listen) {
      localize();
      const next = await invoke("nuts_boards");
      if (!visible()) return;
      boardChoices = next;
      renderBoardList();
      dropSubscription ??= listen("nuts-board-file-drop", event => { if (visible()) addPaths(event.payload); })
        .catch(error => { dropSubscription = undefined; throw error; });
      await dropSubscription;
      if (visible()) {
        dropTarget = dropTarget.catch(() => {}).then(() => invoke("nuts_board_drop_target", { active: visible() }));
        await dropTarget;
      }
      await reload();
    },
    close() {
      loading += 1;
      restoreGesture(gesture);
      gesture = null;
      viewport.classList.remove("is-dragging-canvas");
      marquee.hidden = true;
      renderGroups();
      dropTarget = dropTarget.catch(() => {}).then(() => invoke("nuts_board_drop_target", { active: visible() }));
      return dropTarget;
    },
  };

  function localize() {
      document.getElementById("nutsTagline").textContent = copy("随手记下，慢慢长成。", "Capture ideas. Let them grow.");
      for (const [id, label] of Object.entries({
        nutsSceneLabel: copy("从场景开始", "Start from a scene"),
        nutsBoardRules: copy("工作规则", "Board rules"),
        nutsRulesTitle: copy("白板工作规则", "Board rules"),
        nutsRuleNameLabel: copy("规则名称", "Rule name"),
        nutsRuleTemplatesTitle: copy("查看模板", "See templates"),
        nutsRuleGoalLabel: copy("想用这张白板做什么？", "What is this board for?"),
        nutsRuleTemplateLabel: copy("起步模板", "Starter template"),
        nutsDraftRule: copy("生成规则草稿", "Draft rules"),
        nutsRulesCancel: copy("取消", "Cancel"),
        nutsSaveRules: copy("保存白板规则", "Save board rules"),
        nutsIssueTemplateLabel: copy("议题模板", "Issue template"),
        nutsIssueGoalLabel: copy("这次想做成什么？", "What should this produce?"),
      })) button(id, label);
      button("nutsNewBoard", copy("新建白板", "New board"));
      button("nutsNewBoardTitle", copy("新建白板", "New board"));
      button("nutsNewBoardLabel", copy("白板名称", "Board name"));
      button("nutsNewBoardCancel", copy("取消", "Cancel"));
      button("nutsNewBoardSubmit", copy("创建白板", "Create board"));
      button("nutsNewNote", copy("记 NUT", "New NUT"));
      button("nutsAddMarkdown", copy("添加素材", "Add materials"));
      button("nutsPan", copy("拖动画布", "Pan canvas"));
      if (pan.getAttribute("aria-pressed") === "true") pan.dataset.tooltip = copy("平移已开启 · 按住画布拖动", "Pan enabled · Drag the canvas");
      for (const [id, text] of [["nutsZoomOut", copy("缩小", "Zoom out")], ["nutsZoomIn", copy("放大", "Zoom in")]]) {
        const control = document.getElementById(id);
        control.setAttribute("aria-label", text);
        control.title = text;
      }
      button("nutsZoomFit", copy("适应内容", "Fit content"));
      zoom.title = copy("当前缩放", "Current zoom");
      zoom.setAttribute("aria-label", zoom.title);
      board.setAttribute("aria-label", copy("NUTS 白板", "NUTS board"));
      document.getElementById("nutsBoardHint").textContent = copy("双击空白记 NUT · 粘贴链接或拖入文件 · 框选或点选归拢", "Double-click to capture · Paste links or drop files · Drag a box or click cards to group");
      paintSelection();
      renderBoardList();
  }
};
