// Advanced Notes App (Notorium) — Vanilla JS
(function () {
  const STORAGE_KEY = "notorium-v1";
  const THEME_KEY = "notorium-theme";

  // Elements
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const tagFilterChips = document.getElementById("tagFilterChips");
  const showArchived = document.getElementById("showArchived");
  const showTrash = document.getElementById("showTrash");
  const newNoteBtn = document.getElementById("newNoteBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const themeToggle = document.getElementById("themeToggle");

  // Editor
  const editor = document.getElementById("editor");
  const backdrop = document.getElementById("editorBackdrop");
  const closeEditorBtn = document.getElementById("closeEditor");
  const pinBtn = document.getElementById("pinBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const trashBtn = document.getElementById("trashBtn");
  const noteTitle = document.getElementById("noteTitle");
  const noteContent = document.getElementById("noteContent");
  const colorPalette = document.getElementById("colorPalette");
  const tagList = document.getElementById("tagList");
  const tagInput = document.getElementById("tagInput");
  const meta = document.getElementById("meta");

  const snackbar = document.getElementById("snackbar");

  let state = {
    notes: [],
    filterQuery: "",
    filterTag: null,
    sort: "updatedAt-desc",
    viewArchived: false,
    viewTrash: false,
    selected: null, // id
  };

  // Utils
  const now = () => Date.now();
  const uid = () => Number(String(Date.now()) + String(Math.floor(Math.random() * 999)).padStart(3,"0"));

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Resetting broken storage", e);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  // Data helpers
  function addNote() {
    const n = {
      id: uid(),
      title: "",
      content: "",
      color: "vanilla",
      tags: [],
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: now(),
      updatedAt: now(),
    };
    state.notes.push(n);
    save();
    openEditor(n.id);
  }

  function updateNote(id, patch) {
    const n = state.notes.find((x) => x.id === id);
    if (!n) return;
    Object.assign(n, patch, { updatedAt: now() });
    save();
  }

  function archiveToggle(id) {
    const n = state.notes.find((x) => x.id === id);
    if (!n) return;
    n.archived = !n.archived;
    n.trashed = false;
    n.updatedAt = now();
    save();
    toast(n.archived ? "Archived" : "Unarchived");
    render();
  }

  function trashMove(id) {
    const n = state.notes.find((x) => x.id === id);
    if (!n) return;
    const prev = { ...n };
    n.trashed = true;
    n.archived = false;
    n.updatedAt = now();
    save();
    toast("Moved to Trash", { undo: () => { Object.assign(n, prev); save(); render(); } });
    render();
  }

  function deleteForever(id) {
    const idx = state.notes.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const removed = state.notes.splice(idx, 1)[0];
      save();
      toast("Deleted permanently", { undo: () => { state.notes.splice(idx, 0, removed); save(); render(); } });
      render();
    }
  }

  function restore(id) {
    const n = state.notes.find((x) => x.id === id);
    if (!n) return;
    n.trashed = false;
    n.archived = false;
    n.updatedAt = now();
    save();
    toast("Restored");
    render();
  }

  // Rendering
  function render() {
    // Update tag chips
    const tags = new Set();
    state.notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    tagFilterChips.innerHTML = "";
    [...tags].sort().forEach(t => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = "#" + t;
      chip.dataset.tag = t;
      if (state.filterTag === t) chip.style.outline = "2px solid var(--accent-2)";
      chip.addEventListener("click", () => {
        state.filterTag = (state.filterTag === t) ? null : t;
        render();
      });
      tagFilterChips.appendChild(chip);
    });

    // Filtered notes
    const q = state.filterQuery.trim().toLowerCase();
    let notes = state.notes.filter(n => {
      if (!state.viewArchived && n.archived) return false;
      if (!state.viewTrash && n.trashed) return false;
      if (state.viewArchived && !n.archived) return false;
      if (state.viewTrash && !n.trashed) return false;
      if (state.filterTag && !n.tags.includes(state.filterTag)) return false;
      if (!q) return true;
      const hay = (n.title + " " + n.content + " " + n.tags.map(t => "#"+t).join(" ")).toLowerCase();
      return hay.includes(q);
    });

    // Sort
    const [field, dir] = state.sort.split("-");
    notes.sort((a,b) => {
      let va, vb;
      if (field === "title") { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else { va = a[field]; vb = b[field]; }
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });

    // Pinned first
    notes.sort((a,b) => (b.pinned - a.pinned));

    grid.innerHTML = "";
    notes.forEach(n => grid.appendChild(renderCard(n)));
  }

  function renderCard(n) {
    const tpl = document.getElementById("noteCardTpl");
    const node = tpl.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".card-title");
    const body = node.querySelector(".card-body");
    const tagsEl = node.querySelector(".tags");
    const stamp = node.querySelector(".stamp");
    const pin = node.querySelector(".pin");
    const archive = node.querySelector(".archive");
    const trash = node.querySelector(".trash");

    title.textContent = n.title || "Untitled";
    body.textContent = n.content || "…";
    stamp.textContent = (n.archived ? "Archived " : n.trashed ? "Trashed " : "Updated ") + before(n.updatedAt);

    // color style
    node.style.background = colorBg(n.color);

    // actions
    node.addEventListener("click", (e) => {
      if (e.target.closest(".icon-btn")) return;
      openEditor(n.id);
    });

    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      updateNote(n.id, { pinned: !n.pinned });
      render();
    });

    archive.addEventListener("click", (e) => {
      e.stopPropagation();
      archiveToggle(n.id);
    });

    trash.addEventListener("click", (e) => {
      e.stopPropagation();
      if (n.trashed) deleteForever(n.id);
      else trashMove(n.id);
    });
    trash.title = n.trashed ? "Delete Forever" : "Trash";

    // tags
    tagsEl.innerHTML = "";
    n.tags.forEach(t => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "#" + t;
      tagsEl.appendChild(tag);
    });

    return node;
  }

  function colorBg(name) {
    const map = {
      vanilla: "#fff7e1",
      mint: "#ccffe0",
      rose: "#ffe2ea",
      sky: "#e2f1ff",
      lavender: "#efe4ff",
      gold: "#fff2bf",
    };
    return map[name] || "var(--card)";
  }

  function openEditor(id) {
    state.selected = id;
    const n = state.notes.find(x => x.id === id);
    if (!n) return;
    noteTitle.value = n.title || "";
    noteContent.value = n.content || "";
    noteContent.style.minHeight = "240px";
    tagList.innerHTML = "";
    n.tags.forEach(addTagChip);
    meta.textContent = `Created ${before(n.createdAt)} • Updated ${before(n.updatedAt)}`;
    // button states
    pinBtn.style.opacity = n.pinned ? "1" : ".8";
    archiveBtn.style.opacity = n.archived ? "1" : ".8";
    // show
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add("show");
      editor.classList.add("show");
      editor.setAttribute("aria-hidden", "false");
      noteTitle.focus();
    });
  }

  function closeEditor() {
    editor.classList.remove("show");
    backdrop.classList.remove("show");
    editor.setAttribute("aria-hidden", "true");
    setTimeout(() => { backdrop.hidden = true; }, 200);
    state.selected = null;
    render();
  }

  function addTagChip(tag) {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = "#" + tag;
    const x = document.createElement("span");
    x.className = "x";
    x.textContent = "×";
    x.title = "Remove";
    x.addEventListener("click", () => {
      const n = state.notes.find(x => x.id === state.selected);
      if (!n) return;
      n.tags = n.tags.filter(t => t !== tag);
      save();
      tagList.innerHTML = "";
      n.tags.forEach(addTagChip);
      render();
    });
    chip.appendChild(x);
    tagList.appendChild(chip);
  }

  // Humanized timestamp
  function before(ts) {
    const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec/60); if (min < 60) return `${min}m ago`;
    const h = Math.floor(min/60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h/24);
    return `${d}d ago`;
  }

  // Snackbar
  let sbTimer = null;
  function toast(text, opts = {}) {
    snackbar.textContent = "";
    const content = document.createElement("span");
    content.textContent = text;
    snackbar.appendChild(content);
    if (opts.undo) {
      const btn = document.createElement("button");
      btn.className = "undo";
      btn.textContent = "Undo";
      btn.addEventListener("click", () => {
        opts.undo();
        hide();
      });
      snackbar.appendChild(btn);
    }
    snackbar.classList.add("show");
    clearTimeout(sbTimer);
    sbTimer = setTimeout(hide, 4500);
    function hide(){ snackbar.classList.remove("show"); }
  }

  // Export/Import
  function exportNotes() {
    const data = JSON.stringify(state.notes, null, 2);
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notorium-notes.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importNotes(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("Invalid file");
        // merge by id; new ids if conflicts
        const byId = Object.fromEntries(state.notes.map(n => [n.id, n]));
        arr.forEach(n => {
          if (!n.id || byId[n.id]) n.id = uid();
          state.notes.push(n);
        });
        save();
        render();
        toast("Imported notes");
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  // Theme cycle
  const THEMES = ["classic","midnight","candy"];
  function applyTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem(THEME_KEY, name);
  }
  function cycleTheme() {
    const cur = localStorage.getItem(THEME_KEY) || "classic";
    const idx = THEMES.indexOf(cur);
    applyTheme(THEMES[(idx + 1) % THEMES.length]);
  }

  // Wire events
  const homeLink = document.getElementById('homeLink');
  if (homeLink) homeLink.addEventListener('click', (e) => {
    // If editor is open, just close it without reloading
    if (editor.classList.contains('show')) {
      e.preventDefault();
      closeEditor();
    }
  });

  searchInput.addEventListener("input", () => { state.filterQuery = searchInput.value; render(); });
  sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; render(); });
  showArchived.addEventListener("change", () => { state.viewArchived = showArchived.checked; if (state.viewArchived) { showTrash.checked = false; state.viewTrash = false; } render();});
  showTrash.addEventListener("change", () => { state.viewTrash = showTrash.checked; if (state.viewTrash) { showArchived.checked = false; state.viewArchived = false; } render();});
  newNoteBtn.addEventListener("click", (e) => { e.preventDefault(); addNote(); });
  exportBtn.addEventListener("click", exportNotes);
  importInput.addEventListener("change", (e) => { if (e.target.files[0]) importNotes(e.target.files[0]); });
  themeToggle.addEventListener("click", cycleTheme);

  closeEditorBtn.addEventListener("click", closeEditor);
  backdrop.addEventListener("click", closeEditor);

  noteTitle.addEventListener("input", () => { if (!state.selected) return; updateNote(state.selected, { title: noteTitle.value }); /* live title render */ render(); });
  noteContent.addEventListener("input", autoGrow);
  noteContent.addEventListener("input", () => { if (!state.selected) return; updateNote(state.selected, { content: noteContent.value }); });

  function autoGrow() {
    noteContent.style.height = "auto";
    noteContent.style.height = (noteContent.scrollHeight + 6) + "px";
  }

  pinBtn.addEventListener("click", () => { if (!state.selected) return; const n = state.notes.find(x => x.id === state.selected); updateNote(n.id, { pinned: !n.pinned }); pinBtn.style.opacity = n.pinned ? "1" : ".8"; });
  archiveBtn.addEventListener("click", () => { if (!state.selected) return; archiveToggle(state.selected); closeEditor(); });
  trashBtn.addEventListener("click", () => { if (!state.selected) return; const n = state.notes.find(x => x.id === state.selected); if (n.trashed) deleteForever(n.id); else trashMove(n.id); closeEditor(); });

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = tagInput.value.trim().replace(/^#/, "");
      if (!v) return;
      const n = state.notes.find(x => x.id === state.selected);
      if (!n) return;
      if (!n.tags.includes(v)) n.tags.push(v);
      save();
      tagInput.value = "";
      tagList.innerHTML = "";
      n.tags.forEach(addTagChip);
      render();
    }
  });

  colorPalette.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-color]");
    if (!btn || !state.selected) return;
    updateNote(state.selected, { color: btn.dataset.color });
    render();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault(); searchInput.focus(); return;
    }
    if (e.key.toLowerCase() === "n") {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      e.preventDefault(); addNote(); return;
    }
    if (e.key === "Escape" && editor.classList.contains("show")) {
      e.preventDefault(); closeEditor(); return;
    }
  });

  // Init
  (function init() {
    state.notes = load();
    state.sort = sortSelect.value;
    searchInput.value = state.filterQuery;
    showArchived.checked = state.viewArchived;
    showTrash.checked = state.viewTrash;
    applyTheme(localStorage.getItem(THEME_KEY) || "classic");
    render();

    // Welcome sample if empty
    if (state.notes.length === 0) {
      const id = uid();
      state.notes.push({
        id,
        title: "Welcome ✨",
        content: "This is Notorium—classic looks, fun energy.\n• Press N to add a new note\n• Click a card to edit\n• Use #tags and colors\n• Export from the top-right",
        color: "sky",
        tags: ["welcome","tips"],
        pinned: true, archived: false, trashed: false,
        createdAt: Date.now(), updatedAt: Date.now()
      });
      save(); render();
    }
  })();
})();
