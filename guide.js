// Interactive guide for Notorium
(function(){
  const spawnDemoBtn = document.getElementById("spawnDemo");
  const demoGrid = document.getElementById("demoGrid");
  const addBtn = document.getElementById("demoAdd");
  const shuffleBtn = document.getElementById("demoShuffle");
  const clearBtn = document.getElementById("demoClear");

  const sample = [
    { title: "Pin notes", body: "Pin important notes to keep them at the top.", color: "#e2f1ff" },
    { title: "Use tags", body: "Add #tags to group and search easily.", color: "#ffe2ea" },
    { title: "Archive", body: "Archive notes you don’t need daily; keep trash clean.", color: "#fff7e1" },
    { title: "Export/Import", body: "Backup as JSON; restore later on any device.", color: "#efe4ff" },
  ];

  function card(n) {
    const el = document.createElement("article");
    el.className = "card glow-hover";
    el.style.background = n.color;
    el.innerHTML = `<header><h3 class="card-title">${n.title}</h3></header>
                    <div class="card-body">${n.body}</div>`;
    el.addEventListener("mouseenter", () => { el.style.filter = "brightness(1.03)"; });
    el.addEventListener("mouseleave", () => { el.style.filter = "none"; });
    return el;
  }

  function render(arr) {
    demoGrid.innerHTML = "";
    arr.forEach(x => demoGrid.appendChild(card(x)));
  }

  spawnDemoBtn.addEventListener("click", () => render(sample));
  addBtn.addEventListener("click", () => {
    sample.push({ title: "New tip", body: "You can create, search, tag, and color notes!", color: "#ccffe0" });
    render(sample);
  });
  shuffleBtn.addEventListener("click", () => {
    sample.sort(() => Math.random() - 0.5);
    render(sample);
  });
  clearBtn.addEventListener("click", () => { sample.length = 0; render(sample); });
})();
