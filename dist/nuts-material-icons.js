(() => {
  const fileOutline = '<path d="M5 2.5h6l4 4v11H5zM11 2.5v4h4"/>';
  const icons = {
    file: fileOutline,
    issue: '<rect x="4" y="3" width="12" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h3"/>',
    text: fileOutline + '<path d="M7.5 10h5m-5 3h4"/>',
    word: fileOutline + '<path d="m7.2 10.1 1 3.6 1.8-2.6 1.8 2.6 1-3.6"/>',
    markdown: '<path d="M2.5 5h15v10h-15zM5 12V8l2 2 2-2v4m4-4v4m-1.5-1.5L13 12l1.5-1.5"/>',
    html: '<rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="M8 8 6 10l2 2m4-4 2 2-2 2"/>',
    pdf: fileOutline + '<path d="M7.4 13.8c1.2-1 2.1-2.8 2.6-4.6.5 1.8 1.4 3.4 2.6 4.4-1.5-.6-3.4-.5-5.2.2z"/>',
    spreadsheet: '<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M3 8h14M3 12h14M8 8v8.5m4-8.5v8.5"/>',
    slides: '<rect x="3" y="3.5" width="14" height="10" rx="1.5"/><path d="M10 13.5v3m-2 0h4m-4.5-9h5m-5 2.5h3"/>',
    image: '<rect x="3" y="3.5" width="14" height="13" rx="2"/><circle cx="12.8" cy="7.2" r="1"/><path d="m3.5 13 4-4 3.5 3.5 2-2 3.5 3.5"/>',
    link: '<path d="m8 12 4-4m-1-2 1.7-1.7a2.8 2.8 0 0 1 4 4L15 10m-6 4-1.7 1.7a2.8 2.8 0 0 1-4-4L5 10"/>',
  };
  const formats = new Map([
    ["md", "markdown"], ["markdown", "markdown"], ["txt", "text"],
    ["html", "html"], ["htm", "html"], ["pdf", "pdf"],
    ["doc", "word"], ["docx", "word"],
    ["ppt", "slides"], ["pptx", "slides"],
    ["xls", "spreadsheet"], ["xlsx", "spreadsheet"],
    ["png", "image"], ["jpg", "image"], ["jpeg", "image"], ["gif", "image"], ["webp", "image"],
    ["link", "link"], ["issue", "issue"],
  ]);

  window.createNutsMaterialIcon = (format, url) => {
    const icon = document.createElement("span");
    icon.className = "nuts-material-icon";
    icon.setAttribute("aria-hidden", "true");
    if (format === "note") {
      const mascot = document.createElement("img");
      mascot.src = "./assets/nuts/nut-icon-v7.png";
      mascot.alt = "";
      mascot.draggable = false;
      icon.append(mascot);
      icon.dataset.materialIcon = "note";
      return icon;
    }

    let kind = formats.get(format?.toLowerCase()) || "file";
    if (kind === "link" && url) {
      try {
        const extension = new URL(url).pathname.split("/").pop().match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
        // A normal web page is a link. Direct downloads inherit their document type.
        const target = formats.get(extension);
        if (target && target !== "html") kind = target;
      } catch {}
    }
    icon.dataset.materialIcon = kind;
    icon.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[kind]}</svg>`;
    return icon;
  };
})();
