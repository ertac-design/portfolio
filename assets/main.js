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

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  ready();
})();
