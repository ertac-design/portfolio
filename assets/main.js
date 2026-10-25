(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ready = () => root.classList.add("is-ready");

  // Logo strip: three copies of the set; the scroll position is wrapped
  // to stay within the middle copy, so it loops in both directions. It
  // drifts left on its own (unless motion is reduced), pauses while
  // hovered or focused, follows mouse drags and steps with the buttons.
  document.querySelectorAll("[data-marquee]").forEach((marquee) => {
    const wrap = marquee.closest(".marquee-wrap");
    const track = marquee.querySelector(".marquee-track");
    const items = [...track.children];
    for (let i = 0; i < 20 && track.scrollWidth < marquee.clientWidth; i++) {
      items.forEach((item) => track.append(item.cloneNode(true)));
    }
    const set = [...track.children];
    for (let copy = 0; copy < 2; copy++) {
      set.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.querySelector("img").alt = "";
        track.append(clone);
      });
    }

    const span = () => track.scrollWidth / 3;
    let pos = span();
    let paused = false;
    let drag = null;
    let glide = null;
    const apply = () => {
      const w = span();
      if (pos < w * 0.5) pos += w;
      if (pos > w * 1.5) pos -= w;
      marquee.scrollLeft = pos;
    };
    apply();

    // Native scrolling (trackpad, touch) moves the strip too.
    marquee.addEventListener("scroll", () => {
      if (Math.abs(marquee.scrollLeft - pos) > 1) {
        pos = marquee.scrollLeft;
        if (!drag && !glide) apply();
      }
    });

    const hold = (on) => () => (paused = on);
    wrap.addEventListener("pointerenter", hold(true));
    wrap.addEventListener("pointerleave", hold(false));
    wrap.addEventListener("focusin", hold(true));
    wrap.addEventListener("focusout", hold(false));

    marquee.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { x: event.clientX, pos };
      glide = null;
      marquee.setPointerCapture(event.pointerId);
      marquee.classList.add("is-dragging");
    });
    marquee.addEventListener("pointermove", (event) => {
      if (!drag) return;
      pos = drag.pos - (event.clientX - drag.x);
      apply();
      drag.pos = pos;
      drag.x = event.clientX;
    });
    const endDrag = () => {
      drag = null;
      marquee.classList.remove("is-dragging");
    };
    marquee.addEventListener("pointerup", endDrag);
    marquee.addEventListener("pointercancel", endDrag);

    wrap.querySelectorAll(".marquee-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const step = marquee.clientWidth * 0.5 * (button.classList.contains("prev") ? -1 : 1);
        if (reduceMotion) {
          pos += step;
          return apply();
        }
        glide = { from: pos, by: step, start: performance.now() };
      });
    });

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (glide) {
        const t = Math.min((now - glide.start) / 600, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        pos = glide.from + glide.by * eased;
        if (t === 1) glide = null;
        apply();
      } else if (!paused && !drag && !reduceMotion) {
        pos += dt * 0.04;
        apply();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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

  // Copy the email address, with a short confirmation on the button.
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.querySelector("span");
    const idle = label.textContent;
    let timer = 0;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
      } catch {
        return;
      }
      label.textContent = "Copied";
      button.classList.add("is-copied");
      clearTimeout(timer);
      timer = setTimeout(() => {
        label.textContent = idle;
        button.classList.remove("is-copied");
      }, 1800);
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  ready();
})();
