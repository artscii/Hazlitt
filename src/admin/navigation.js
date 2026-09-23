// v3.8.1: reverse the card turn on all Admin links back to the Atlas.
let returningToAtlas = false;
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    returningToAtlas = false;
    document.body.getAnimations().forEach((a) => a.cancel());
    document.documentElement.classList.remove("screen-flipping");
    document.body.style.transformOrigin = "";
  }
});
document.addEventListener("click", async (event) => {
  const link = event.target.closest('a[href="/"]');
  if (
    !link ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  if (returningToAtlas) return;
  if (
    hasProjectDraft() &&
    !confirm("Discard unsaved project changes and return to the Atlas?")
  )
    return;
  returningToAtlas = true;
  let config = catalog?.config;
  try {
    if (!config) config = await api("/api/config");
  } catch {}
  if (
    config?.editFlipEnabled &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    try {
      sessionStorage.setItem(
        "atlas-return-flip",
        JSON.stringify({ duration: config.editFlipDuration }),
      );
      document.documentElement.classList.add("screen-flipping");
      document.body.style.transformOrigin =
        "50% " + (scrollY + innerHeight / 2) + "px";
      await document.body.animate(
        [
          {
            transform: "perspective(1800px) rotateY(0deg)",
            filter: "brightness(1)",
          },
          {
            transform: "perspective(1800px) rotateY(90deg)",
            filter: "brightness(.72)",
          },
        ],
        {
          duration: config.editFlipDuration / 2,
          easing: "cubic-bezier(.55,0,1,.45)",
          fill: "forwards",
        },
      ).finished;
    } catch {}
  }
  location.assign(link.href);
});
