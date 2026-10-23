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

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const pointerMotion = finePointer && !reduceMotion;
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Runs a frame loop only while something is still moving.
  function animator(step) {
    let frame = 0;
    const tick = () => {
      frame = step() ? requestAnimationFrame(tick) : 0;
    };
    return () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
  }

  // Word by word reveal: each word slides up out of its own mask.
  function splitWords(el) {
    let index = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
        if (child.nodeType !== Node.TEXT_NODE) return;
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (!part.trim()) return fragment.append(" ");
          const word = document.createElement("span");
          const inner = document.createElement("span");
          word.className = "word";
          inner.textContent = part;
          inner.style.setProperty("--i", index++);
          word.append(inner);
          fragment.append(word);
        });
        child.replaceWith(fragment);
      });
    };
    walk(el);
    el.classList.add("split-words");
  }

  if (!reduceMotion) document.querySelectorAll(".section-title, .statement").forEach(splitWords);

  // Magnetic buttons and links pull toward the cursor.
  if (pointerMotion) {
    document.querySelectorAll(".btn, .nav a, .view-toggle").forEach((el) => {
      const strength = el.classList.contains("btn") ? 0.3 : 0.4;
      let box = null;
      el.classList.add("magnetic");
      el.addEventListener("pointerenter", () => {
        el.style.transform = "";
        box = el.getBoundingClientRect();
      });
      el.addEventListener("pointermove", (event) => {
        if (!box) return;
        const x = (event.clientX - box.left - box.width / 2) * strength;
        const y = (event.clientY - box.top - box.height / 2) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => {
        box = null;
        el.style.transform = "";
      });
    });
  }

  // "View" bubble follows the cursor inside each work thumbnail.
  if (pointerMotion) {
    document.querySelectorAll(".work-card .thumb").forEach((thumb) => {
      const view = thumb.querySelector(".view");
      if (!view) return;
      const pos = { x: 0, y: 0, tx: 0, ty: 0 };
      const run = animator(() => {
        pos.x = lerp(pos.x, pos.tx, 0.18);
        pos.y = lerp(pos.y, pos.ty, 0.18);
        view.style.translate = `${pos.x}px ${pos.y}px`;
        return Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y) > 0.1;
      });
      const target = (event) => {
        const box = thumb.getBoundingClientRect();
        pos.tx = event.clientX - box.left - box.width / 2;
        pos.ty = event.clientY - box.top - box.height / 2;
      };
      thumb.addEventListener("pointerenter", (event) => {
        target(event);
        pos.x = pos.tx;
        pos.y = pos.ty;
        run();
      });
      thumb.addEventListener("pointermove", (event) => {
        target(event);
        run();
      });
    });
  }

  // Work layout toggle (grid or list), remembered per browser.
  const grid = document.querySelector(".work-grid");
  const toggle = document.querySelector(".view-toggle");
  const VIEW_KEY = "work-view";
  if (grid && toggle) {
    const buttons = toggle.querySelectorAll("button[data-view]");
    const apply = (view) => {
      grid.classList.toggle("is-list", view === "list");
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
    };
    let saved = null;
    try { saved = localStorage.getItem(VIEW_KEY); } catch {}
    if (saved === "list") apply("list");

    toggle.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button || button.getAttribute("aria-pressed") === "true") return;
      const view = button.dataset.view;
      try { localStorage.setItem(VIEW_KEY, view); } catch {}
      if (reduceMotion) return apply(view);
      grid.classList.add("is-switching");
      setTimeout(() => {
        apply(view);
        grid.classList.remove("is-switching");
      }, 350);
    });
  }

  // List view: a floating preview of the hovered project follows the cursor.
  if (grid && pointerMotion) {
    const cards = [...grid.querySelectorAll(".work-card")];
    const preview = document.createElement("div");
    preview.className = "work-preview";
    preview.setAttribute("aria-hidden", "true");
    const track = document.createElement("div");
    track.className = "work-preview-track";
    cards.forEach((card) => {
      const source = card.querySelector("img");
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.src = source ? source.currentSrc || source.src : "";
      track.append(img);
    });
    preview.append(track);
    document.body.append(preview);

    const pos = { x: 0, y: 0, tx: 0, ty: 0, scale: 0, ts: 0, rotate: 0 };
    const run = animator(() => {
      pos.x = lerp(pos.x, pos.tx, 0.14);
      pos.y = lerp(pos.y, pos.ty, 0.14);
      pos.scale = lerp(pos.scale, pos.ts, 0.14);
      pos.rotate = lerp(pos.rotate, clamp((pos.tx - pos.x) * 0.06, -8, 8), 0.12);
      preview.style.transform =
        `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${pos.rotate}deg) scale(${pos.scale})`;
      return (
        Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y) > 0.1 ||
        Math.abs(pos.ts - pos.scale) > 0.001 ||
        Math.abs(pos.rotate) > 0.01
      );
    });

    grid.addEventListener("pointermove", (event) => {
      const card = grid.classList.contains("is-list") && event.target.closest(".work-card");
      if (card && pos.scale < 0.01) {
        pos.x = event.clientX;
        pos.y = event.clientY;
      }
      pos.tx = event.clientX;
      pos.ty = event.clientY;
      pos.ts = card ? 1 : 0;
      if (card) track.style.transform = `translateY(${-cards.indexOf(card) * 100}%)`;
      run();
    });
    grid.addEventListener("pointerleave", () => {
      pos.ts = 0;
      run();
    });
    grid.addEventListener("click", () => {
      pos.ts = 0;
      run();
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
