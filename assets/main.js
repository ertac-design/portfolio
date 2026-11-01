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

  // Testimonials: a snapping row of cards. The card nearest the left edge
  // is the active one; buttons step between cards and mouse drags scroll.
  document.querySelectorAll("[data-slider]").forEach((slider) => {
    const row = slider.querySelector(".slides");
    const slides = [...row.children];
    const section = slider.closest("section");
    const prev = section.querySelector("[data-prev]");
    const next = section.querySelector("[data-next]");
    const current = section.querySelector("[data-current]");
    section.querySelector("[data-total]").textContent = slides.length;
    let active = -1;

    const setActive = (index) => {
      if (index === active) return;
      active = index;
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
      current.textContent = index + 1;
      slider.style.setProperty("--progress", `${((index + 1) / slides.length) * 100}%`);
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    };
    const nearest = () => {
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      if (atEnd) return slides.length - 1;
      let best = 0;
      slides.forEach((slide, i) => {
        if (Math.abs(slide.offsetLeft - row.offsetLeft - row.scrollLeft) <
            Math.abs(slides[best].offsetLeft - row.offsetLeft - row.scrollLeft)) best = i;
      });
      return best;
    };
    const go = (index) => {
      const target = slides[Math.max(0, Math.min(slides.length - 1, index))];
      row.scrollTo({ left: target.offsetLeft - row.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    };

    row.addEventListener("scroll", () => setActive(nearest()), { passive: true });
    prev.addEventListener("click", () => go(active - 1));
    next.addEventListener("click", () => go(active + 1));

    let drag = null;
    row.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { x: event.clientX, left: row.scrollLeft };
      row.setPointerCapture(event.pointerId);
      row.classList.add("is-dragging");
    });
    row.addEventListener("pointermove", (event) => {
      if (drag) row.scrollLeft = drag.left - (event.clientX - drag.x);
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      row.classList.remove("is-dragging");
      go(nearest());
    };
    row.addEventListener("pointerup", endDrag);
    row.addEventListener("pointercancel", endDrag);

    setActive(0);
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
