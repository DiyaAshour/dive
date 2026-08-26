const dateIntentScript = String.raw`(() => {
  const root = document.documentElement;
  const hasSelectedDates = () => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("arrival") && params.get("departure"));
  };

  const clearDateInputs = (selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.value = "";
        element.removeAttribute("value");
      }
    });
  };

  const decorateDateFreeRateActions = (selected) => {
    document.querySelectorAll('.hotelExperience .publicRateAction').forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (selected) {
        element.removeAttribute("role");
        element.removeAttribute("tabindex");
        element.removeAttribute("aria-label");
        return;
      }
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", document.documentElement.lang === "ar" ? "اختر التواريخ لإظهار السعر المباشر" : "Choose dates to reveal the live price");
    });
  };

  const focusHotelDates = () => {
    const card = document.querySelector('.hotelExperience .availabilityCard');
    const arrival = document.querySelector('.hotelExperience .availabilityForm input[name="arrival"]');
    if (card instanceof HTMLElement) card.scrollIntoView({behavior:"smooth", block:"center"});
    window.setTimeout(() => {
      if (arrival instanceof HTMLInputElement) {
        arrival.focus({preventScroll:true});
        try { arrival.showPicker?.(); } catch {}
      }
    }, 320);
  };

  const sync = () => {
    const path = window.location.pathname;
    const selected = hasSelectedDates();

    root.removeAttribute("data-hotel-stay");
    root.removeAttribute("data-search-stay");
    root.removeAttribute("data-home-date-intent");

    if (path === "/") {
      root.setAttribute("data-home-date-intent", "unselected");
      const clearHome = () => clearDateInputs('.premiumSearchDock input[name="arrival"], .premiumSearchDock input[name="departure"]');
      requestAnimationFrame(clearHome);
      window.setTimeout(clearHome, 40);
      return;
    }

    if (/^\/hotel\/[^/]+\/?$/.test(path)) {
      root.setAttribute("data-hotel-stay", selected ? "selected" : "unselected");
      const syncRateActions = () => decorateDateFreeRateActions(selected);
      requestAnimationFrame(syncRateActions);
      window.setTimeout(syncRateActions, 40);
      if (!selected) {
        const clearHotel = () => clearDateInputs('.hotelExperience .availabilityForm input[name="arrival"], .hotelExperience .availabilityForm input[name="departure"]');
        requestAnimationFrame(clearHotel);
        window.setTimeout(clearHotel, 40);
      }
      return;
    }

    if (path === "/search") {
      root.setAttribute("data-search-stay", selected ? "selected" : "unselected");
      if (!selected) {
        const clearSearch = () => clearDateInputs('.searchExperience .searchSummaryForm input[name="arrival"], .searchExperience .searchSummaryForm input[name="departure"]');
        requestAnimationFrame(clearSearch);
        window.setTimeout(clearSearch, 40);
      }
    }
  };

  const stripAutoDatesFromBrowseLink = (event) => {
    if (window.location.pathname !== "/") return;
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    if (!(target instanceof HTMLAnchorElement)) return;

    const url = new URL(target.href, window.location.href);
    const isHotelLink = /^\/hotel\/[^/]+\/?$/.test(url.pathname);
    const isSearchLink = url.pathname === "/search";
    if (!isHotelLink && !isSearchLink) return;
    if (!url.searchParams.has("arrival") && !url.searchParams.has("departure")) return;

    url.searchParams.delete("arrival");
    url.searchParams.delete("departure");
    event.preventDefault();
    window.location.assign(url.pathname + (url.search ? url.search : ""));
  };

  const activateDateFreeRate = (event) => {
    if (root.getAttribute("data-hotel-stay") !== "unselected") return;
    const target = event.target instanceof Element ? event.target.closest('.publicRateAction') : null;
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    focusHotelDates();
  };

  const activateDateFreeRateWithKeyboard = (event) => {
    if (root.getAttribute("data-hotel-stay") !== "unselected") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof Element ? event.target.closest('.publicRateAction') : null;
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    focusHotelDates();
  };

  const wrapHistory = (method) => {
    const original = history[method];
    history[method] = function(...args) {
      const result = original.apply(this, args);
      queueMicrotask(sync);
      return result;
    };
  };

  wrapHistory("pushState");
  wrapHistory("replaceState");
  window.addEventListener("popstate", sync);
  document.addEventListener("click", stripAutoDatesFromBrowseLink, true);
  document.addEventListener("click", activateDateFreeRate, true);
  document.addEventListener("keydown", activateDateFreeRateWithKeyboard, true);

  sync();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, {once: true});
  }
})();`;

export function DateIntentGate() {
  return <script dangerouslySetInnerHTML={{__html: dateIntentScript}}/>;
}
