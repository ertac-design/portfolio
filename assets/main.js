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

  ready();
})();
