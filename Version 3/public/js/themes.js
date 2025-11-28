const THEME_KEY = "kkev-theme";
const ACCENT_KEY = "kkev-accent";
const AUTO_MODE_KEY = "kkev-theme-auto";

let currentTheme = "dark";

/* Theme Helpers */

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  const select = document.getElementById("theme-select");
  if (select && select.value !== theme) {
    select.value = theme;
  }
  // Wenn Deko-System existiert, mitziehen
  if (typeof updateSeasonalDecor === "function") {
    updateSeasonalDecor(theme);
  }
}

function applyAccentColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-soft", `${color}33`);
  localStorage.setItem(ACCENT_KEY, color);
}

/* Auto-Theme (Events + Seasons) */

function detectGw2EventTheme(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // Halloween ungefähr 15.10–2.11
  if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) {
    return "halloween";
  }

  // Wintersday ungefähr 10.12–5.1
  if ((m === 12 && d >= 10) || (m === 1 && d <= 5)) {
    return "winter";
  }

  return null;
}

function detectSeasonalTheme(date = new Date()) {
  const m = date.getMonth() + 1;

  // grob: Winter
  if (m === 12 || m === 1 || m === 2) return "winter";
  // Frühling
  if (m >= 3 && m <= 5) return "spring";
  // Herbst
  if (m >= 9 && m <= 11) return "autumn";
  // Sommer → light
  return "light";
}

function getAutoThemeForToday() {
  const now = new Date();
  const eventTheme = detectGw2EventTheme(now);
  if (eventTheme) return eventTheme;
  return detectSeasonalTheme(now);
}

/* Initial Theme */

(function initTheme() {
  const autoMode = localStorage.getItem(AUTO_MODE_KEY) === "1";
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";

  if (autoMode) {
    const autoTheme = getAutoThemeForToday();
    applyTheme(autoTheme);
  } else {
    applyTheme(savedTheme);
  }

  const savedAccent = localStorage.getItem(ACCENT_KEY);
  if (savedAccent) {
    applyAccentColor(savedAccent);
  }
})();

/* UI Hooks */

document.addEventListener("DOMContentLoaded", () => {
  const themeSelect = document.getElementById("theme-select");
  const accentPicker = document.getElementById("accent-picker");
  const autoToggle = document.getElementById("theme-auto-toggle");

  const autoMode = localStorage.getItem(AUTO_MODE_KEY) === "1";

  if (autoToggle) {
    autoToggle.checked = autoMode;
  }

  if (themeSelect) {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    themeSelect.value = current;

    themeSelect.addEventListener("change", () => {
      // manuelle Auswahl deaktiviert Auto-Mode
      if (autoToggle) {
        autoToggle.checked = false;
      }
      localStorage.setItem(AUTO_MODE_KEY, "0");

      const t = themeSelect.value;
      localStorage.setItem(THEME_KEY, t);
      applyTheme(t);
    });
  }

  if (accentPicker) {
    const savedAccent = localStorage.getItem(ACCENT_KEY);
    if (savedAccent) {
      accentPicker.value = savedAccent;
    } else {
      const cs = getComputedStyle(document.documentElement);
      const accent = cs.getPropertyValue("--accent").trim() || "#f97316";
      accentPicker.value = accent;
    }

    accentPicker.addEventListener("input", () => {
      applyAccentColor(accentPicker.value);
    });
  }

  if (autoToggle) {
    autoToggle.addEventListener("change", () => {
      const enabled = autoToggle.checked;
      localStorage.setItem(AUTO_MODE_KEY, enabled ? "1" : "0");

      if (enabled) {
        const autoTheme = getAutoThemeForToday();
        applyTheme(autoTheme);
      } else {
        const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
        applyTheme(savedTheme);
      }
    });
  }
});
