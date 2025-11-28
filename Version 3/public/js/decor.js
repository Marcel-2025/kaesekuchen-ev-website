function initSeasonalDecor() {
  const root = document.getElementById("season-decor-root");
  if (!root) return;

  // Schneeflocken
  for (let i = 0; i < 40; i++) {
    const span = document.createElement("span");
    span.className = "snowflake";
    span.textContent = "❄";

    const left = Math.random() * 100;
    const duration = 10 + Math.random() * 15;
    const delay = Math.random() * -duration;
    const size = 0.7 + Math.random() * 1.1;

    span.style.left = left + "%";
    span.style.animationDuration = duration + "s";
    span.style.animationDelay = delay + "s";
    span.style.fontSize = size + "rem";

    root.appendChild(span);
  }

  // Halloween-Spuk
  const spookyEmojis = ["🎃", "🕯️", "🕸️", "🦇"];
  spookyEmojis.forEach((emoji, idx) => {
    const span = document.createElement("span");
    span.className = "spooky";
    span.textContent = emoji;

    const fromLeft = idx % 2 === 0;
    span.style.bottom = 5 + idx * 7 + "%";
    span.style[fromLeft ? "left" : "right"] = "4%";
    span.style.animationDelay = idx * 0.8 + "s";

    root.appendChild(span);
  });
}

function updateSeasonalDecor(theme) {
  const root = document.getElementById("season-decor-root");
  if (!root) return;
  root.setAttribute("data-season-theme", theme);
}

document.addEventListener("DOMContentLoaded", () => {
  initSeasonalDecor();
  const theme = typeof currentTheme !== "undefined" ? currentTheme : "dark";
  updateSeasonalDecor(theme);
});
