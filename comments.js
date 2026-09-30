/* Per-item discussion threads backed by GitHub Discussions via giscus.
   Each indicator / event maps to its own discussion (mapping "specific", strict term match).
   Threads load lazily when a reader opens them, so the page stays light. */
(function () {
  const CONFIG = {
    repo: "sumit-badsara/india-gov-scorecard",
    repoId: "R_kgDOU1LMJg",
    category: "Scorecard comments",
    categoryId: "", // fill in from https://giscus.app after enabling Discussions
    lang: "en",
  };
  const ORIGIN = "https://giscus.app";
  const discussionsUrl = `https://github.com/${CONFIG.repo}/discussions`;

  // giscus returns ?giscus=<session> after GitHub sign-in; keep it and clean the URL.
  try {
    const url = new URL(location.href);
    const s = url.searchParams.get("giscus");
    if (s) {
      localStorage.setItem("giscus-session", JSON.stringify(s));
      url.searchParams.delete("giscus");
      history.replaceState(null, "", url.toString());
    }
  } catch (e) {}
  function session() {
    try { return JSON.parse(localStorage.getItem("giscus-session") || '""'); } catch (e) { return ""; }
  }
  function theme() {
    const t = document.documentElement.dataset.theme;
    if (t === "dark") return "dark";
    if (t === "light") return "light";
    return "preferred_color_scheme";
  }

  const frames = new Map(); // window -> iframe, for resize messages
  addEventListener("message", (ev) => {
    if (ev.origin !== ORIGIN || !ev.data || !ev.data.giscus) return;
    const f = frames.get(ev.source);
    if (f && ev.data.giscus.resizeHeight) f.style.height = ev.data.giscus.resizeHeight + "px";
  });

  function mount(box, term, title) {
    if (box.dataset.loaded) return;
    box.dataset.loaded = "1";
    if (!CONFIG.categoryId) {
      box.innerHTML = `<p class="gz-note">Comments are being set up. Meanwhile you can join the conversation on <a href="${discussionsUrl}" target="_blank" rel="noopener">GitHub Discussions</a>.</p>`;
      return;
    }
    const origin = location.href.split("#")[0];
    try { sessionStorage.setItem("gz-open", term); } catch (e) {}
    const p = new URLSearchParams({
      origin, session: session(), theme: theme(), reactionsEnabled: "1", emitMetadata: "0",
      inputPosition: "top", repo: CONFIG.repo, repoId: CONFIG.repoId, category: CONFIG.category,
      categoryId: CONFIG.categoryId, strict: "1", description: title, backLink: origin,
      term, number: "0",
    });
    const f = document.createElement("iframe");
    f.className = "gz-frame";
    f.title = "Comments: " + title;
    f.loading = "lazy";
    f.setAttribute("scrolling", "no");
    f.src = `${ORIGIN}/${CONFIG.lang}/widget?${p.toString()}`;
    f.style.cssText = "width:100%;border:0;min-height:150px;color-scheme:normal";
    box.innerHTML = `<p class="gz-note">Comments and reactions are public and stored in this site's <a href="${discussionsUrl}" target="_blank" rel="noopener">GitHub Discussions</a>. Sign in with GitHub to post.</p>`;
    box.appendChild(f);
    f.addEventListener("load", () => frames.set(f.contentWindow, f));
  }

  // Wire every [data-term] button: toggle its target container and load the thread.
  function wire(root) {
    root.querySelectorAll("button.disc[data-term]").forEach((b) => {
      if (b.dataset.wired) return;
      b.dataset.wired = "1";
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", () => {
        const target = document.getElementById(b.getAttribute("aria-controls"));
        const open = target.hidden;
        target.hidden = !open;
        b.setAttribute("aria-expanded", String(open));
        if (open) mount(target.querySelector(".gz") || target, b.dataset.term, b.dataset.title || b.dataset.term);
      });
    });
  }

  // After GitHub sign-in the page reloads; reopen the thread the reader was on.
  function reopen() {
    let t = "";
    try { t = sessionStorage.getItem("gz-open") || ""; } catch (e) {}
    if (!t || !session()) return;
    const b = [...document.querySelectorAll("button.disc[data-term]")].find((x) => x.dataset.term === t);
    if (b && b.getAttribute("aria-expanded") !== "true") { b.click(); b.scrollIntoView({ block: "center" }); }
  }

  window.Discuss = { wire, reopen, discussionsUrl };
})();
