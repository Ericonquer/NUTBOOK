window.NutbookNutsPicker = function (id, labelId, onChange) {
  const root = document.getElementById(id);
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "nuts-picker-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const valueLabel = document.createElement("span");
  valueLabel.id = `${id}Value`;
  const menu = document.createElement("div");
  menu.id = `${id}Options`;
  menu.className = "nuts-picker-menu";
  menu.setAttribute("popover", "auto");
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-labelledby", labelId);
  trigger.setAttribute("aria-labelledby", `${labelId} ${valueLabel.id}`);
  trigger.setAttribute("aria-controls", menu.id);
  trigger.append(valueLabel);
  root.append(trigger, menu);

  let entries = [];
  let index = -1;

  function render() {
    valueLabel.textContent = entries[index]?.label ?? "";
    trigger.disabled = entries.length === 0;
    [...menu.children].forEach((option, i) => option.setAttribute("aria-selected", String(i === index)));
  }

  function close(restoreFocus = false) {
    if (menu.matches(":popover-open")) menu.hidePopover();
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function choose(next) {
    index = next;
    render();
    close(true);
    onChange?.(entries[index]);
  }

  function position() {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const placeAbove = below < menu.scrollHeight + margin && above > below;
    menu.style.width = `${Math.min(Math.max(rect.width, 156), window.innerWidth - margin * 2)}px`;
    menu.style.maxHeight = `${Math.min(260, Math.max(0, (placeAbove ? above : below) - 6))}px`;
    menu.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - menu.offsetWidth - margin))}px`;
    menu.style.top = `${placeAbove ? rect.top - 6 - menu.offsetHeight : rect.bottom + 6}px`;
  }

  function show() {
    if (!entries.length || menu.matches(":popover-open")) return;
    menu.showPopover();
    position();
    menu.children[Math.max(0, index)]?.focus({ preventScroll: true });
  }

  trigger.onclick = () => menu.matches(":popover-open") ? close(true) : show();
  trigger.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    show();
  });
  menu.addEventListener("toggle", () => trigger.setAttribute("aria-expanded", String(menu.matches(":popover-open"))));
  menu.addEventListener("keydown", event => {
    const options = [...menu.children];
    const focused = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close(true);
      return;
    }
    const keys = {
      ArrowDown: Math.min(options.length - 1, focused + 1),
      ArrowUp: Math.max(0, focused - 1),
      Home: 0,
      End: options.length - 1,
    };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    options[keys[event.key]]?.focus();
  });
  root.closest("dialog")?.addEventListener("close", () => close());
  window.addEventListener("resize", () => { if (menu.matches(":popover-open")) position(); });

  return {
    close,
    get value() { return entries[index]?.value ?? ""; },
    get selected() { return entries[index]; },
    setOptions(options, value) {
      close();
      entries = options;
      index = Math.max(0, entries.findIndex(entry => entry.value === value));
      menu.replaceChildren(...entries.map((entry, i) => {
        const option = document.createElement("button");
        option.type = "button";
        option.tabIndex = -1;
        option.setAttribute("role", "option");
        option.setAttribute("aria-label", entry.label);
        option.textContent = entry.label;
        option.onclick = () => choose(i);
        return option;
      }));
      render();
    },
  };
};
