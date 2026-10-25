(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ready = () => root.classList.add("is-ready");

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

  // Logo strip: repeat the set until it outruns the strip, then add a hidden
  // copy so translating by -50% loops without a seam.
  document.querySelectorAll("[data-marquee]").forEach((marquee) => {
    if (reduceMotion) return;
    const track = marquee.querySelector(".marquee-track");
    const set = [...track.children];
    const width = () => track.scrollWidth;
    for (let i = 0; i < 20 && width() < marquee.clientWidth; i++) {
      set.forEach((item) => track.append(item.cloneNode(true)));
    }
    [...track.children].forEach((item) => {
      const copy = item.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.querySelector("img").alt = "";
      track.append(copy);
    });
    marquee.style.setProperty("--marquee-duration", `${width() / 2 / 40}s`);
    marquee.classList.add("is-running");
  });

  // Testimonials: client names switch the quote (tabs, with arrow keys).
  document.querySelectorAll("[data-quotes]").forEach((block) => {
    const tabs = [...block.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = block.querySelector(`#${t.getAttribute("aria-controls")}`);
        panel.hidden = !on;
        panel.classList.toggle("is-entering", on);
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  ready();
})();
