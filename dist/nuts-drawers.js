window.NutbookNutsDrawers = function ({ copy, openIssue, locateCard, report }) {
  const cabinet = document.getElementById("nutsCabinet");
  const buttons = document.getElementById("nutsDrawerButtons");
  const pane = document.getElementById("nutsDrawer");
  const items = document.getElementById("nutsDrawerItems");
  const heading = document.getElementById("nutsDrawerHeading");
  const shade = document.getElementById("nutsDrawerShade");
  const closeButton = document.getElementById("nutsDrawerClose");
  const acknowledged = new Set();
  let current = -1;
  let labels = [];
  let groups = [[], [], [], []];
  let signature = "";

  function close(restoreFocus = true) {
    const previous = current;
    current = -1;
    render();
    if (restoreFocus && previous >= 0) buttons.children[previous]?.focus();
  }

  function render() {
    for (const [index, button] of [...buttons.children].entries()) {
      const entries = groups[index];
      const [label, count, dot] = button.querySelector(".nuts-drawer-caption").children;
      label.textContent = labels[index];
      count.textContent = entries.length;
      dot.hidden = !entries.some(entry => entry.status === "claimed" || !acknowledged.has(entry.id + ":" + entry.status));
      button.setAttribute("aria-expanded", String(index === current));
      button.title = labels[index];
    }
    pane.hidden = shade.hidden = current < 0;
    if (current < 0) return;
    pane.style.setProperty("--drawer-center", `${(current + .5) * 25}%`);
    heading.textContent = labels[current];
    const entries = groups[current];
    const nextSignature = JSON.stringify([current, labels, entries]);
    if (nextSignature === signature) return;
    signature = nextSignature;
    items.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.textContent = copy("这里还没有内容", "Nothing here yet");
      items.append(empty);
    }
    for (const entry of entries) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "nuts-drawer-item";
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const state = document.createElement("small");
      state.textContent = {
        note: "NUT", markdown: "Markdown", link: copy("链接", "Link"),
        draft: copy("待开放", "Not yet open"),
        open: copy("待领取", "Open for claim"),
        claimed: copy("Agent 进行中", "Agent working"),
        review: copy("待审阅", "Ready for review"),
        done: copy("已入库", "In library"),
      }[entry.status] || entry.status.toUpperCase();
      row.append(title, state);
      row.title = entry.title;
      row.addEventListener("click", () => {
        const action = current === 0 ? locateCard : openIssue;
        close(false);
        action(entry.id).catch(report);
      });
      items.append(row);
    }
  }

  for (let index = 0; index < 4; index++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nuts-drawer-toggle";
    button.setAttribute("aria-controls", pane.id);
    button.innerHTML = '<span class="nuts-drawer-slot" aria-hidden="true"></span><span class="nuts-drawer-caption"><strong></strong><span></span><i aria-hidden="true"></i></span>';
    button.onclick = () => {
      if (current === index) { close(); return; }
      current = index;
      for (const entry of groups[index]) acknowledged.add(entry.id + ":" + entry.status);
      render();
      closeButton.focus();
    };
    buttons.append(button);
  }
  closeButton.onclick = () => close();
  shade.onclick = () => close();
  document.addEventListener("keydown", event => {
    if (current >= 0 && event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  return {
    close,
    update(issues, cards) {
      labels = [copy("收件箱", "Inbox"), copy("待推进", "Next up"), copy("进行中", "In progress"), copy("成果", "Results")];
      groups = [
        cards.map(card => ({ id: card.id, title: card.title, status: card.kind })),
        issues.filter(issue => ["draft", "open"].includes(issue.status)),
        issues.filter(issue => ["claimed", "review"].includes(issue.status)),
        issues.filter(issue => issue.status === "done"),
      ];
      closeButton.title = shade.title = copy("关闭抽屉", "Close drawer");
      closeButton.setAttribute("aria-label", closeButton.title);
      shade.setAttribute("aria-label", shade.title);
      cabinet.setAttribute("aria-label", copy("抽屉", "Drawers"));
      render();
    },
  };
};
