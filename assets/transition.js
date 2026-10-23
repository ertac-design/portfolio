// Cross-document View Transitions: pairs a project card's image on the home
// page with the cover on that project's page so one grows into the other.
// Loaded in <head> without defer so pageswap/pagereveal are never missed.
(() => {
  const NAME = "project-cover";
  const LAST_PATH = "last-path";
  let nextPath = null;

  // Compare paths with or without ".html", as hosts may serve either.
  const clean = (path) => (path || "").replace(/\.html$/, "").replace(/\/index$/, "/");
  const isProject = (path) => /\/work\/[^/]+$/.test(clean(path));
  const isHome = (path) => !!path && clean(path).endsWith("/");

  const coverOf = (path) => {
    if (isProject(location.pathname)) return document.querySelector(".cover");
    const card = [...document.querySelectorAll(".work-card")].find(
      (link) => clean(new URL(link.href).pathname) === clean(path)
    );
    return card && card.querySelector(".media");
  };

  const inView = (el) => {
    const box = el.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight;
  };

  const pair = (el) => {
    if (el && inView(el)) el.style.viewTransitionName = NAME;
  };

  const unpair = () => {
    document.querySelectorAll(".cover, .work-card .media").forEach((el) => {
      el.style.viewTransitionName = "";
    });
  };

  // Remember where a click is heading, for browsers without event.activation.
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest("a[href]");
    if (link) nextPath = new URL(link.href, location.href).pathname;
  });

  // Old page: name the element that should travel, if it pairs with the next page.
  window.addEventListener("pageswap", (event) => {
    try { sessionStorage.setItem(LAST_PATH, location.pathname); } catch {}
    if (!event.viewTransition) return;
    const url = event.activation && event.activation.entry && event.activation.entry.url;
    const to = url ? new URL(url).pathname : nextPath;
    const here = location.pathname;
    if (isHome(here) && isProject(to)) pair(coverOf(to));
    else if (isProject(here) && isHome(to)) pair(coverOf(here));
  });

  // New page: name the matching element so the browser can morph between them.
  window.addEventListener("pagereveal", (event) => {
    if (!event.viewTransition) return;
    let from = null;
    try { from = sessionStorage.getItem(LAST_PATH); } catch {}
    const here = location.pathname;
    if (isProject(here) && isHome(from)) pair(coverOf(here));
    else if (isHome(here) && isProject(from)) pair(coverOf(from));
    event.viewTransition.finished.finally(unpair);
  });
})();
