/* --------------- THEME --------------- */
    const THEME_KEY = "kkev-theme";
    const ACCENT_KEY = "kkev-accent";
    const AUTO_MODE_KEY = "kkev-theme-auto";
    let currentTheme = "dark";

    function applyTheme(theme) {
      currentTheme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      const select = document.getElementById("theme-select");
      if (select && select.value !== theme) {
        select.value = theme;
      }
      updateSeasonalDecor(theme);
    }


    function applyAccentColor(color) {
      if (!color) return;
      document.documentElement.style.setProperty("--accent", color);
      document.documentElement.style.setProperty("--accent-soft", `${color}33`); // leichte Transparenz
      localStorage.setItem(ACCENT_KEY, color);
    }

    // einfache Event-Erkennung (GW2-Events grob nach Datum)
    function detectGw2EventTheme(date = new Date()) {
      const m = date.getMonth() + 1; // 1–12
      const d = date.getDate();

      // Halloween: ca. 15.10–2.11
      if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) {
        return "halloween";
      }

      // Wintersday: ca. 10.12–5.1
      if ((m === 12 && d >= 10) || (m === 1 && d <= 5)) {
        return "winter";
      }

      // später könntest du hier auch Lunar New Year, SAB etc. einbauen
      return null;
    }

    // Jahreszeiten-Erkennung (grob nach Monat)
    function detectSeasonalTheme(date = new Date()) {
      const m = date.getMonth() + 1;

      if (m === 12 || m === 1 || m === 2) return "winter";  // Winter
      if (m >= 3 && m <= 5) return "spring";                // Frühling
      if (m >= 9 && m <= 11) return "autumn";               // Herbst

      // Sommer: nimm einfach Light oder Dark, wie du magst
      return "light";
    }

    // wählt Event-Theme, sonst Season-Theme
    function getAutoThemeForToday() {
      const now = new Date();
      const eventTheme = detectGw2EventTheme(now);
      if (eventTheme) return eventTheme;
      return detectSeasonalTheme(now);
    }

    // Initial Theme/Accent laden
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


    function formatDate(iso) {
      if (!iso) return "–";
      const d = new Date(iso);
      if (isNaN(d)) return "–";
      return d.toLocaleDateString("de-DE");
    }

    function relativeTime(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d)) return "";
      const diffMs = Date.now() - d.getTime();
      const sec = Math.round(diffMs / 1000);
      const min = Math.round(sec / 60);
      const h = Math.round(min / 60);
      const day = Math.round(h / 24);
      if (sec < 60) return "vor wenigen Sekunden";
      if (min < 60) return `vor ${min} Minuten`;
      if (h < 24) return `vor ${h} Stunden`;
      if (day < 7) return `vor ${day} Tagen`;
      const weeks = Math.round(day / 7);
      if (weeks < 5) return `vor ${weeks} Wochen`;
      const months = Math.round(day / 30);
      if (months < 12) return `vor ${months} Monaten`;
      const years = Math.round(day / 365);
      return `vor ${years} Jahren`;
    }

    /* ---------------- GUILD INFO ---------------- */
    async function loadGuildInfo() {
      const nameEl = document.getElementById("guild-name");
      const tagEl = document.getElementById("guild-tag");
      const metaEl = document.getElementById("guild-meta");
      const motdEl = document.getElementById("motd-text");
      const statMembers = document.getElementById("stat-members");
      const statLevel = document.getElementById("stat-level");
      const statWorld = document.getElementById("stat-world");

      try {
        const res = await fetch("/api/guild-info");
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();

        nameEl.textContent = data.name || "Käsekuchen Ev";
        tagEl.textContent = data.tag ? `[${data.tag}]` : "[KKev]";
        metaEl.textContent = `Level ${data.level} • ${data.member_count} Mitglieder`;

        statMembers.textContent = data.member_count;
        statLevel.textContent = data.level;
        statWorld.textContent = data.world;

        motdEl.textContent = data.motd || "Keine MOTD gesetzt.";
      } catch (err) {
        metaEl.textContent = "Fehler beim Laden";
        motdEl.textContent = "Fehler: " + err.message;
      }
    }

    /* ---------------- MEMBERS ---------------- */
    let guildMembers = [];

    async function loadGuildMembers() {
      const body = document.getElementById("members-body");
      const counter = document.getElementById("member-count-label");
      const pill = document.getElementById("members-status-pill");

      body.innerHTML = "";

      try {
        const res = await fetch("/api/guild-members");
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        const members = data.members || [];
        guildMembers = members;

        counter.textContent = members.length;

        members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        
let invitedCount = 0;
let visibleMembers = [];

members.forEach(m => {
  const isInvited = (m.rank || "").toLowerCase().includes("invite");
  if (isInvited) {
    invitedCount++;
    return;
  }
  visibleMembers.push(m);

  const tr = document.createElement("tr");
  const isOnline = m.online === true || m.status === "Online";

  tr.innerHTML = `
    <td>
      <div class="member-name">
        <span class="status-dot ${isOnline ? "online" : "offline"}"></span>
        <span>${m.name}</span>
      </div>
    </td>
    <td>
      <span class="rank-pill ${(m.rank || "").toLowerCase().includes("leader") ? "leader" : ""}">
        ${m.rank || "-"}
      </span>
    </td>
    <td>${formatDate(m.joined)}</td>
  `;

  body.appendChild(tr);
});

if (invitedCount > 0) {
  pill.textContent = `Geladen (${invitedCount} Einladungen ausgeblendet)`;
} else {
  pill.textContent = "Geladen";
}

counter.textContent = visibleMembers.length;


        pill.textContent = "Geladen";
      } catch (err) {
        pill.textContent = "Fehler";
      }

      buildLeaderboard();
    }

    function buildLeaderboard() {
      const list = document.getElementById("leaderboard-list");
      list.innerHTML = "";

      if (!guildMembers.length) return;

      const sorted = [...guildMembers].sort((a, b) => {
        const rankValue = r => r.toLowerCase().includes("leader") ? 0 :
                               r.toLowerCase().includes("offi") ? 1 : 2;
        return rankValue(a.rank) - rankValue(b.rank);
      });

      sorted.slice(0, 5).forEach((m, i) => {
        const li = document.createElement("li");
        li.className = "leaderboard-item";
        li.innerHTML = `
          <div>${i + 1}. ${m.name}</div>
          <div>${m.rank}</div>
        `;
        list.appendChild(li);
      });
    }

    /* ---------------- GUILD HALL ---------------- */
    async function loadGuildHall() {
      const hallName = document.getElementById("hall-name");
      const hallLevel = document.getElementById("hall-level");
      const hallUp = document.getElementById("hall-upgrades-count");
      const status = document.getElementById("hall-status-text");

      try {
        const res = await fetch("/api/guild-hall");
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();

        hallName.textContent = data.hall || "–";
        hallLevel.textContent = data.level || "–";
        hallUp.textContent = data.upgrades ? data.upgrades.length : "–";

        status.textContent = "Geladen";
      } catch (err) {
        status.textContent = "Fehler: " + err.message;
      }
    }

    /* ---------------- GUILD LOG ---------------- */
    function formatLog(entry) {
      const t = entry.time ? new Date(entry.time).toLocaleString("de-DE") : "";
      if (entry.type === "joined") return `${t} – ${entry.user} ist beigetreten`;
      if (entry.type === "kick") return `${t} – ${entry.user} wurde entfernt`;
      if (entry.type === "invited") return `${t} – ${entry.user} wurde eingeladen`;
      if (entry.type === "rank_change") return `${t} – ${entry.user} wurde befördert`;
      if (entry.type === "motd") return `${t} – MOTD geändert`;
      return `${t} – ${entry.type}`;
    }

    
async function loadGuildLog() {
  const list = document.getElementById("guild-log-list");
  const status = document.getElementById("guild-log-status");
  list.innerHTML = "";

  try {
    const res = await fetch("/api/guild-log");
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    list.className = "log-timeline";

    data.log.forEach(e => {
      const li = document.createElement("li");
      li.className = "log-entry";

      const timeText = e.time ? new Date(e.time).toLocaleString("de-DE") : "";
      const rel = e.time ? relativeTime(e.time) : "";

      const type = (e.type || "").toLowerCase();
      let label = "Event";
      if (type === "joined") label = "Beitritt";
      else if (type === "kick") label = "Kick";
      else if (type === "invited") label = "Einladung";
      else if (type === "rank_change") label = "Rangänderung";
      else if (type === "motd") label = "MOTD";

      let text = formatLog(e);

      li.innerHTML = `
        <div class="log-dot"></div>
        <div class="log-entry-meta">
          <span class="log-entry-type">${label}</span>
          <span>${timeText}</span>
          <span>${rel}</span>
        </div>
        <div>${text}</div>
      `;

      list.appendChild(li);
    });

    status.textContent = "Geladen";
  } catch (err) {
    status.textContent = "Fehler: " + err.message;
  }
}



    /* ---------------- TREASURY ---------------- */
    
async function loadGuildTreasury() {
  const tbody = document.getElementById("treasury-body");
  const status = document.getElementById("treasury-status");
  tbody.innerHTML = "";

  try {
    const res = await fetch("/api/guild-treasury");
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    const items = data.treasury || [];

    items.slice(0, 20).forEach(t => {
      const have = t.count || 0;
      const need = t.required || 0;
      const pct = need > 0 ? Math.min(100, Math.round(have / need * 100)) : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div>${t.item_name || t.item_id}</div>
          <div class="treasury-progress">
            <div class="treasury-progress-fill" style="width:${pct}%;"></div>
          </div>
        </td>
        <td style="text-align:right">${have}</td>
        <td style="text-align:right">${need}</td>
      `;
      tbody.appendChild(tr);
    });

    status.textContent = "Geladen";
  } catch (err) {
    status.textContent = "Fehler: " + err.message;
  }
}



    /* ---------------- ACCOUNTS / CHARS ---------------- */
    async function loadAccounts() {
      const select = document.getElementById("account-select");
      const pill = document.getElementById("accounts-status-pill");

      try {
        const res = await fetch("/api/accounts");
        if (!res.ok) throw new Error("HTTP " + res.status);

        const accounts = await res.json();
        select.innerHTML = "";

        accounts.forEach(a => {
          const opt = document.createElement("option");
          opt.value = a.id;
          opt.textContent = `${a.name} (Welt ${a.world})`;
          select.appendChild(opt);
        });

        pill.textContent = "Geladen";
      } catch (err) {
        pill.textContent = "Fehler";
      }
    }

    async function loadCharacters() {
      const select = document.getElementById("account-select");
      const list = document.getElementById("characters-list");
      const status = document.getElementById("accounts-status-text");

      const id = select.value;
      if (!id) return;

      list.innerHTML = "";
      status.textContent = "Lade…";

      try {
        const res = await fetch(`/api/accounts/${id}/characters`);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        data.characters.forEach(c => {
          const li = document.createElement("li");
          li.textContent = c;
          li.onclick = () => loadCharDetail(id, c);
          list.appendChild(li);
        });

        status.textContent = "Fertig";
      } catch (err) {
        status.textContent = "Fehler: " + err.message;
      }
    }

    
async function loadCharDetail(accId, charName) {
  const status = document.getElementById("accounts-status-text");
  const panel = document.getElementById("char-detail-panel");
  if (panel) {
    panel.innerHTML = "";
  }

  status.textContent = `Lade Details für ${charName}…`;

  try {
    const res = await fetch(`/api/accounts/${accId}/characters/${charName}`);
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    const c = data.character;

    if (panel) {
      panel.innerHTML = `
        <div class="char-detail-name">${c.name}</div>
        <div class="char-detail-meta">
          <span>Level ${c.level}</span>
          <span>${c.race}</span>
          <span>${c.profession}</span>
          <span>Tode: ${c.deaths}</span>
          <span>Erstellt: ${formatDate(c.created)}</span>
        </div>
      `;
    }

    status.textContent = "Details geladen";
  } catch (err) {
    status.textContent = "Fehler: " + err.message;
  }
}

document.getElementById("load-chars-btn").onclick = loadCharacters;
").onclick = loadCharacters;

    /* ---------------- APPLICATION FORM ---------------- */
    document.getElementById("apply-form").addEventListener("submit", e => {
      e.preventDefault();

      const name = document.getElementById("apply-name").value;
      const account = document.getElementById("apply-account").value;
      const time = document.getElementById("apply-time").value;
      const exp = document.getElementById("apply-experience").value;
      const msg = document.getElementById("apply-message").value;

      const out = document.getElementById("apply-output");

      out.value = `
      Hey Käsekuchen.EV,

      ich bin ${name} (${account}).

      Spielzeiten: ${time || "-"}
      Erfahrung: ${exp || "-"}

      Warum ich zu euch möchte:
      ${msg}

      Liebe Grüße,
      ${name}
      `.trim();
    });

    function initSeasonalDecor() {
    const root = document.getElementById("season-decor-root");
    if (!root) return;

    // Schneeflocken generieren
    for (let i = 0; i < 40; i++) {
      const span = document.createElement("span");
      span.className = "snowflake";
      span.textContent = "❄";

      const left = Math.random() * 100;
      const duration = 10 + Math.random() * 15; // 10–25s
      const delay = Math.random() * -duration;  // negative delay für gestreute Startzeiten
      const size = 0.7 + Math.random() * 1.1;   // 0.7–1.8rem

      span.style.left = left + "%";
      span.style.animationDuration = duration + "s";
      span.style.animationDelay = delay + "s";
      span.style.fontSize = size + "rem";

      root.appendChild(span);
    }

    // Halloween-Spuk: Kürbisse, Kerzen, Fledermaus etc.
    const spookyEmojis = ["🎃", "🕯️", "🕸️", "🦇"];
    spookyEmojis.forEach((emoji, idx) => {
      const span = document.createElement("span");
      span.className = "spooky";
      span.textContent = emoji;

      // Positionen: links/rechts, verschiedene Höhen
      const fromLeft = idx % 2 === 0;
      span.style.bottom = 5 + idx * 7 + "%";
      span.style[fromLeft ? "left" : "right"] = "4%";
      span.style.animationDelay = (idx * 0.8) + "s";

      root.appendChild(span);
    });
  }

  function updateSeasonalDecor(theme) {
    const root = document.getElementById("season-decor-root");
    if (!root) return;
    root.setAttribute("data-season-theme", theme);
  }

    /* ---------------- INIT ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
  initSeasonalDecor();
  updateSeasonalDecor(currentTheme);
  loadGuildInfo();
  loadGuildMembers();
  loadGuildHall();
  loadGuildLog();
  loadGuildTreasury();
  loadAccounts();

  const themeSelect = document.getElementById("theme-select");
  const accentPicker = document.getElementById("accent-picker");
  const autoToggle = document.getElementById("theme-auto-toggle");

  const autoMode = localStorage.getItem(AUTO_MODE_KEY) === "1";

  if (autoToggle) {
    autoToggle.checked = autoMode;
  }

  if (themeSelect) {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    themeSelect.value = currentTheme;

    themeSelect.addEventListener("change", () => {
      // sobald der User manuell ein Theme wählt → Auto-Mode aus
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