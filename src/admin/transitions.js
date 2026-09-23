// v3.7.1: the incoming editor is the reverse face of the full-screen card.
function revealEditorBack() {
  let flip = false,
    duration = 400;
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("atlas-editor-flip") || "null",
    );
    flip = !!saved;
    if (Number.isInteger(saved?.duration))
      duration = Math.max(300, Math.min(1600, saved.duration));
    sessionStorage.removeItem("atlas-editor-flip");
  } catch {}
  const root = document.documentElement;
  root.classList.remove("editor-flip-pending");
  if (!flip || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.classList.add("screen-flipping");
  document.body.style.transformOrigin = "50% " + innerHeight / 2 + "px";
  const animation = document.body.animate(
    [
      {
        transform: "perspective(1800px) rotateY(90deg)",
        filter: "brightness(.72)",
      },
      {
        transform: "perspective(1800px) rotateY(0deg)",
        filter: "brightness(1)",
      },
    ],
    { duration: duration / 2, easing: "cubic-bezier(0,.55,.45,1)" },
  );
  animation.finished
    .catch(() => {})
    .finally(() => {
      root.classList.remove("screen-flipping");
      document.body.style.transformOrigin = "";
    });
}
