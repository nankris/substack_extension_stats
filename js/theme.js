export function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === "system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  root.setAttribute("data-theme", resolved);
}

export function watchSystemTheme(getStoredTheme, onChange) {
  if (!window.matchMedia) return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    if (getStoredTheme() === "system") onChange();
  });
}
