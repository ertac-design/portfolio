(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORAGE_KEY = "page-transition";

  // Curtain markup is shared by every page, so it is built here.
  const curtain = document.createElement("div");
  curtain.className = "curtain";
  curtain.setAttribute("aria-hidden", "true");
  curtain.innerHTML = '<div class="curtain-panel"></div><div class="curtain-label"></div>';
  document.body.appendChild(curtain);
  const label = curtain.querySelector(".curtain-label");

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

  // Enter: the page loads behind the curtain, then the curtain lifts off.
  function enter() {
    if (reduceMotion) {
      storage.clear();
      ready();
      return;
    }
    const fromLink = storage.get();
    storage.clear();
    label.textContent = fromLink ? document.body.dataset.page || "" : "Ertaç Yavaşça";
    curtain.className = "curtain is-covering";
    const hold = fromLink ? 150 : 700;
    setTimeout(() => {
      curtain.getBoundingClientRect();
      curtain.className = "curtain is-entering";
      setTimeout(ready, 250);
      setTimeout(() => (curtain.className = "curtain"), 900);
    }, hold);
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

  // Leave: the curtain rises over the page, then the browser navigates.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || reduceMotion || !isInternal(link, event)) return;
    event.preventDefault();
    label.textContent = link.dataset.label || link.textContent.trim();
    curtain.className = "curtain is-leaving";
    storage.set("1");
    setTimeout(() => (location.href = link.href), 800);
  });

  // Back/forward cache restores the page with the curtain still down.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      curtain.className = "curtain";
      ready();
    }
  });

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
