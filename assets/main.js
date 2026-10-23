(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORAGE_KEY = "page-transition";

  // Layout grid overlay used for page transitions, shared by every page.
  const guides = document.createElement("div");
  guides.className = "guides";
  guides.setAttribute("aria-hidden", "true");
  guides.innerHTML =
    '<div class="guides-cols">' +
    Array.from({ length: 12 }, (_, i) => `<span style="--i:${i}"></span>`).join("") +
    '</div><div class="guides-label"></div><div class="guides-bar"></div>';
  document.body.appendChild(guides);
  const label = guides.querySelector(".guides-label");

  const storage = {
    get() {
      try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
    },
    set(value) {
      try { sessionStorage.setItem(STORAGE_KEY, value); } catch {}
    },
    clear() {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    },
  };

  const ready = () => root.classList.add("is-ready");

  // Enter: arriving from a link, the grid is still on; it switches off as the page settles in.
  function enter() {
    const fromLink = storage.get();
    storage.clear();
    if (reduceMotion || !fromLink) return ready();
    label.textContent = document.body.dataset.page || "";
    guides.className = "guides is-on";
    guides.querySelectorAll("span, div").forEach((el) => (el.style.transition = "none"));
    guides.getBoundingClientRect();
    guides.querySelectorAll("span, div").forEach((el) => (el.style.transition = ""));
    setTimeout(() => {
      guides.className = "guides is-off";
      ready();
      setTimeout(() => (guides.className = "guides"), 900);
    }, 120);
  }

  function isInternal(link, event) {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return true;
  }

  // Leave: the grid switches on, the page fades beneath it, then the browser navigates.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || reduceMotion || !isInternal(link, event)) return;
    event.preventDefault();
    label.textContent = link.dataset.label || link.textContent.trim();
    guides.className = "guides is-on";
    root.classList.add("is-leaving");
    storage.set("1");
    setTimeout(() => (location.href = link.href), 750);
  });

  // Back/forward cache restores the page with the grid still on.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      guides.className = "guides";
      root.classList.remove("is-leaving");
      ready();
    }
  });

  // Work cards: the hover light follows the cursor.
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    document.querySelectorAll(".work-card .thumb").forEach((thumb) => {
      thumb.addEventListener("pointermove", (event) => {
        const box = thumb.getBoundingClientRect();
        thumb.style.setProperty("--mx", `${event.clientX - box.left}px`);
        thumb.style.setProperty("--my", `${event.clientY - box.top}px`);
      });
    });
  }

  // Scroll reveal
  const revealed = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    revealed.forEach((el) => io.observe(el));
  } else {
    revealed.forEach((el) => el.classList.add("in"));
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  enter();
})();
