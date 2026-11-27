window.createNutbookNutsSkills = function ({ copy, invoke }) {
  const dialog = document.getElementById("nutsSkillsDialog");
  const title = document.getElementById("nutsSkillsTitle");
  const close = document.getElementById("nutsSkillsClose");
  const importButton = document.getElementById("nutsSkillsImport");
  const back = document.getElementById("nutsSkillsBack");
  const overview = document.getElementById("nutsSkillsOverview");
  const listTitle = document.getElementById("nutsSkillsListTitle");
  const list = document.getElementById("nutsSkillsList");
  const skillIcon = document.querySelector("#nutsBoardSkills svg");
  const reader = document.getElementById("nutsSkillsReader");
  const documentTitle = document.getElementById("nutsSkillDocumentTitle");
  const content = document.getElementById("nutsSkillDocument");
  const metadata = document.getElementById("nutsSkillMetadata");
  const metadataToggle = document.getElementById("nutsSkillMetadataToggle");
  const documentDescription = document.getElementById("nutsSkillDescription");
  const references = document.getElementById("nutsSkillsReferences");
  const referencesTitle = document.getElementById("nutsSkillsReferencesTitle");
  const fileList = document.getElementById("nutsSkillsFiles");
  const status = document.getElementById("nutsSkillsStatus");
  let session = null;

  function splitFrontmatter(raw) {
    const match = raw.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m);
    if (match?.index === 0) return { fields: match[1], body: raw.slice(match[0].length) };
    return { fields: "", body: raw };
  }

  function fieldValue(fields, key) {
    const match = fields.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"));
    const value = match?.[1]?.trim() || "";
    if (value.startsWith('"')) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "string") return parsed;
      } catch {}
    }
    return /^[>|][+-]?$/.test(value) ? "" : value.replace(/^['"]|['"]$/g, "");
  }

  function documentHeading(body) {
    return body.match(/^(?:\uFEFF)?#[ \t]+([^\r\n]+)\r?(?:\n|$)/)?.[1]?.trim() || "";
  }

  function fileSkills(files, workflows = []) {
    return (files || []).map(skill => {
      const { fields, body } = splitFrontmatter(skill.files["SKILL.md"] || "");
      const applied = workflows.find(workflow => workflow.id === skill.id);
      const name = documentHeading(body.trimStart()) || fieldValue(fields, "name") || skill.id;
      const provided = fieldValue(fields, "description");
      const description = provided && provided !== name && provided !== skill.id
        ? provided
        : applied?.name === name ? applied.description || "" : "";
      return { ...skill, name, description };
    });
  }

  function sceneSkills(scene) {
    if (!scene || scene.id === "custom") return [];
    const workflows = scene.workflows ?? [scene];
    return workflows.map(workflow => {
      const steps = (workflow.steps || []).map((step, index) => `${index + 1}. ${step}`);
      const files = { "SKILL.md": [`# ${workflow.name || scene.id}`, workflow.description || scene.instructions, steps.join("\n")].filter(Boolean).join("\n\n") };
      for (const [name, text] of Object.entries(workflow.references || {})) {
        files[`references/${name}`] = text;
      }
      if (workflow.reference) files["references/checklist.md"] = workflow.reference;
      return { id: workflow.id, name: workflow.name || scene.id, description: workflow.description || "", files };
    });
  }

  function createSkillIdentity(skill) {
    const identity = document.createElement("div");
    identity.className = "nuts-skills-identity";
    const icon = document.createElement("span");
    icon.className = "nuts-skills-item-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.append(skillIcon.cloneNode(true));
    const summary = document.createElement("div");
    summary.className = "nuts-skills-summary";
    const name = document.createElement("h3");
    name.textContent = skill.name;
    summary.append(name);
    if (skill.description) {
      const description = document.createElement("p");
      description.textContent = skill.description;
      summary.append(description);
    }
    identity.append(icon, summary);
    return identity;
  }

  function preview(skills) {
    const items = document.createElement("ul");
    items.className = "nuts-skills-list nuts-skill-preview";
    items.setAttribute("role", "list");
    items.setAttribute("aria-labelledby", "nutsNewBoardSkillsTitle");
    for (const skill of skills) {
      const item = document.createElement("li");
      item.append(createSkillIdentity(skill));
      items.append(item);
    }
    return items;
  }

  function setLabel(button, label) {
    button.textContent = label;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function current(run) {
    return session === run && dialog.open;
  }

  function closeDialog() {
    session = null;
    if (dialog.open) dialog.close();
  }

  function updateButtons(run) {
    importButton.disabled = run.busy;
    for (const button of list.querySelectorAll("[data-skill-folder]")) {
      button.disabled = run.busy;
    }
  }

  function showMetadata(open) {
    metadata.hidden = !open;
    metadataToggle.setAttribute("aria-expanded", String(open));
  }

  metadataToggle.onclick = () => showMetadata(metadata.hidden);

  function readFile(run, path) {
    run.path = path;
    const raw = run.skill.files[path];
    const request = ++run.request;
    for (const button of fileList.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.path === path));
    }
    const markdown = /\.md$/i.test(path);
    const body = markdown ? splitFrontmatter(raw).body : raw;
    const name = markdown ? documentHeading(body.trimStart()) : "";
    documentTitle.textContent = path === "SKILL.md" ? run.skill.name : (name || path);
    const description = path === "SKILL.md" ? run.skill.description : "";
    documentDescription.textContent = description;
    documentDescription.title = description;
    documentDescription.hidden = !description;
    content.scrollTop = 0;
    metadataToggle.hidden = true;
    showMetadata(false);
    metadata.replaceChildren();

    if (!markdown) {
      const pre = document.createElement("pre");
      pre.textContent = body;
      content.replaceChildren(pre);
      return;
    }

    content.textContent = copy("正在读取…", "Loading…");
    invoke("nuts_render_skill_markdown", { markdown: raw, fileName: path, stripFirstHeading: Boolean(name) }).then(result => {
      if (!current(run) || run.request !== request) return;
      metadata.innerHTML = result.metadata_html;
      metadataToggle.hidden = !metadata.childElementCount;
      metadata.querySelector(".markdown-frontmatter-label")?.remove();

      const preview = document.createElement("template");
      preview.innerHTML = result.body_html;
      for (const link of preview.content.querySelectorAll("a[href]")) {
        const href = link.getAttribute("href");
        const reference = referencePath(run, href);
        if (reference) {
          const paragraph = link.parentElement;
          const standalone = paragraph?.tagName === "P" && [...paragraph.childNodes]
            .every(node => node === link || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));
          if (standalone && [...fileList.children].some(button => button.dataset.path === reference)) {
            paragraph.remove();
            continue;
          }
          link.dataset.skillReference = reference;
          link.title = copy(`查看参考文件 ${reference}`, `View reference ${reference}`);
        } else if (/^https?:\/\//i.test(href)) {
          link.dataset.skillHref = href;
        } else {
          link.replaceWith(...link.childNodes);
          continue;
        }
        link.setAttribute("href", "#");
      }
      content.replaceChildren(preview.content);
      content.scrollTop = 0;
    }).catch(error => {
      if (current(run) && run.request === request) content.textContent = String(error);
    });
  }

  function referencePath(run, href) {
    if (!href || href.startsWith("/") || href.startsWith("#") || href.includes(":")) return null;
    const parent = run.path.split("/").slice(0, -1);
    const target = href.split(/[?#]/, 1)[0];
    try {
      for (const segment of target.split("/")) {
        const part = decodeURIComponent(segment);
        if (!part || part === ".") continue;
        if (part === "..") {
          if (!parent.length) return null;
          parent.pop();
        } else parent.push(part);
      }
    } catch {
      return null;
    }
    const path = parent.join("/");
    return Object.hasOwn(run.skill.files, path) ? path : null;
  }

  content.onclick = event => {
    const link = event.target.closest("a[data-skill-reference], a[data-skill-href]");
    const run = session;
    if (!link || !run?.skill) return;
    event.preventDefault();
    const { skillReference, skillHref } = link.dataset;
    if (skillReference) {
      readFile(run, skillReference);
      content.focus({ preventScroll: true });
    } else {
      invoke("open_external_url_command", { payload: { url: skillHref } }).catch(error => {
        if (current(run)) status.textContent = String(error);
      });
    }
  };

  function showOverview(run) {
    run.request += 1;
    run.skill = null;
    dialog.dataset.view = "overview";
    reader.hidden = back.hidden = true;
    importButton.hidden = !run.boardId;
    overview.hidden = !list.childElementCount;
    content.replaceChildren();
    metadata.replaceChildren();
    metadataToggle.hidden = true;
    showMetadata(false);
  }

  function openDocument(run, skill, trigger) {
    run.skill = skill;
    run.documentTrigger = trigger;
    dialog.dataset.view = "document";
    overview.hidden = importButton.hidden = true;
    reader.hidden = false;
    back.hidden = !run.boardId;
    const paths = Object.keys(skill.files).filter(path => path !== "SKILL.md").sort();
    references.hidden = !paths.length;
    fileList.replaceChildren();
    if (paths.length) {
      for (const path of ["SKILL.md", ...paths]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.path = path;
        const heading = /\.md$/i.test(path)
          ? documentHeading(splitFrontmatter(skill.files[path]).body.trimStart())
          : "";
        const label = path === "SKILL.md" ? copy("Skill 正文", "Skill document") : (heading || path);
        setLabel(button, label);
        button.onclick = () => readFile(run, path);
        fileList.append(button);
      }
    }
    readFile(run, "SKILL.md");
    documentTitle.focus({ preventScroll: true });
  }

  function documentButton(onOpen) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nuts-skills-action-button";
    setLabel(button, copy("查看文档", "View document"));
    button.onclick = () => onOpen(button);
    return button;
  }

  function showSkills(run, items, importedId) {
    list.replaceChildren();
    const count = items.length;
    const amount = copy(`${count} 项`, `${count} ${count === 1 ? "Skill" : "Skills"}`);
    const label = copy("已配置的 Skill", "Configured");
    listTitle.textContent = `${label} · ${amount}`;
    let importedButton;
    for (const skill of items) {
      const item = document.createElement("li");
      const actions = document.createElement("div");
      actions.className = "nuts-skills-row-actions";
      const docButton = documentButton(button => openDocument(run, skill, button));
      actions.append(docButton);
      if (importedId === skill.id) importedButton = docButton;

      if (run.boardId) {
        const folder = document.createElement("button");
        folder.type = "button";
        folder.className = "nuts-skills-action-button";
        folder.dataset.skillFolder = "";
        setLabel(folder, copy("打开文件夹", "Open folder"));
        folder.onclick = () => {
          invoke("nuts_open_board_skill_folder", { boardId: run.boardId, skillId: skill.id })
            .catch(error => { if (current(run)) status.textContent = String(error); });
        };
        actions.append(folder);
      }
      item.append(createSkillIdentity(skill), actions);
      list.append(item);
    }
    showOverview(run);
    updateButtons(run);
    if (!items.length && !status.textContent) {
      status.textContent = copy("这块白板还没有 Skill。", "This board has no Skills.");
    }
    importedButton?.focus();
  }

  async function loadBoard(run, preferredId) {
    const config = await invoke("nuts_board_config", { boardId: run.boardId });
    if (!current(run)) return;
    status.textContent = config.skill_error || "";
    showSkills(run, fileSkills(config.rules.file_skills, config.rules.scene_skill?.workflows), preferredId);
  }

  function showDialog(label, boardId) {
    const run = { boardId, skill: null, request: 0, busy: false };
    session = run;
    title.textContent = label;
    for (const [button, label] of [
      [close, copy("关闭", "Close")],
      [back, copy("返回列表", "Back to list")],
      [metadataToggle, copy("Skill 声明", "Skill declaration")],
    ]) {
      button.setAttribute("aria-label", label);
      button.dataset.tooltip = label;
    }
    setLabel(importButton, copy("导入 Skill", "Import Skill"));
    referencesTitle.textContent = copy("参考文件", "Reference files");
    content.setAttribute("aria-label", copy("文档正文", "Document body"));
    status.textContent = "";
    list.replaceChildren();
    showOverview(run);
    updateButtons(run);
    if (!dialog.open) dialog.showModal();
    title.focus();
    return run;
  }

  close.onclick = closeDialog;
  back.onclick = () => {
    if (!session) return;
    showOverview(session);
    session.documentTrigger?.focus();
  };
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("close", () => { if (!dialog.open) session = null; });
  importButton.onclick = async () => {
    const run = session;
    if (!run?.boardId || run.busy) return;
    run.busy = true;
    updateButtons(run);
    status.textContent = "";
    try {
      const skill = await invoke("nuts_choose_board_skill");
      if (!skill || !current(run)) return;
      await invoke("nuts_import_board_skill", { boardId: run.boardId, skill });
      if (!current(run)) return;
      await loadBoard(run, skill.id);
    } catch (error) {
      if (current(run)) status.textContent = String(error);
    } finally {
      if (current(run)) {
        run.busy = false;
        updateButtons(run);
      }
    }
  };

  return {
    close: closeDialog,
    fileSkills,
    sceneSkills,
    preview,
    async openBoard(boardId) {
      const run = showDialog(copy("白板 Skill", "Board Skills"), boardId);
      run.busy = true;
      updateButtons(run);
      status.textContent = copy("正在读取…", "Loading…");
      try {
        await loadBoard(run);
      } catch (error) {
        if (current(run)) status.textContent = String(error);
      } finally {
        if (current(run)) {
          run.busy = false;
          updateButtons(run);
        }
      }
    },
    issueDisclosure(rules, snapshot, expanded) {
      if (!rules.file_skills && !rules.scene_skill) return null;
      const label = snapshot ? copy("本轮领取的 Skills", "Skills used for this claim") : copy("白板 Skills", "Board Skills");
      const items = rules.file_skills
        ? fileSkills(rules.file_skills, rules.scene_skill?.workflows)
        : sceneSkills(rules.scene_skill);
      const details = document.createElement("details");
      details.className = "nuts-issue-skills";
      details.open = expanded;
      const summary = document.createElement("summary");
      summary.textContent = label;
      details.append(summary);
      if (!items.length) {
        const empty = document.createElement("p");
        empty.textContent = snapshot
          ? copy("本轮未领取 Skills。", "This claim did not include any Skills.")
          : copy("这块白板还没有 Skill。", "This board has no Skills.");
        details.append(empty);
        return details;
      }
      const rows = document.createElement("ul");
      rows.className = "nuts-skills-list";
      rows.setAttribute("role", "list");
      for (const skill of items) {
        const item = document.createElement("li");
        const button = documentButton(trigger => openDocument(showDialog(label), skill, trigger));
        button.setAttribute("aria-haspopup", "dialog");
        item.append(createSkillIdentity(skill), button);
        rows.append(item);
      }
      details.append(rows);
      return details;
    },
  };
};
