let guildMembers = [];
let memberSortMode = "name";
let memberRankFilter = "all";

/* Helper */

function formatDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getRankOrder(rank) {
  if (!rank) return 999;
  const r = rank.toLowerCase();
  if (r.includes("lead")) return 0;
  if (r.includes("offiz") || r.includes("officer")) return 1;
  return 2;
}

/* MEMBERS */

function initMemberRankFilter() {
  const rankFilterSelect = document.getElementById("member-rank-filter");
  if (!rankFilterSelect) return;

  const ranksSet = new Set();
  guildMembers.forEach((m) => {
    if (m.rank) ranksSet.add(m.rank);
  });

  const ranks = Array.from(ranksSet).sort(
    (a, b) => getRankOrder(a) - getRankOrder(b)
  );

  rankFilterSelect
    .querySelectorAll("option:not([value='all'])")
    .forEach((o) => o.remove());

  ranks.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rankFilterSelect.appendChild(opt);
  });
}

function renderMemberTable() {
  const body = document.getElementById("members-body");
  const rankFilterSelect = document.getElementById("member-rank-filter");
  const sortSelect = document.getElementById("member-sort-select");
  if (!body) return;

  if (rankFilterSelect) memberRankFilter = rankFilterSelect.value;
  if (sortSelect) memberSortMode = sortSelect.value;

  let list = guildMembers.slice();

  if (memberRankFilter !== "all") {
    list = list.filter((m) => m.rank === memberRankFilter);
  }

  list.sort((a, b) => {
    if (memberSortMode === "rank") {
      return (
        getRankOrder(a.rank) - getRankOrder(b.rank) ||
        (a.name || "").localeCompare(b.name || "")
      );
    }
    if (memberSortMode === "joined") {
      const da = a.joined ? new Date(a.joined).getTime() : 0;
      const db = b.joined ? new Date(b.joined).getTime() : 0;
      return da - db;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  body.innerHTML = "";
  list.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>
        <span class="rank-pill ${
          m.rank && m.rank.toLowerCase().includes("lead") ? "leader" : ""
        }">
          ${m.rank}
        </span>
      </td>
      <td>${formatDate(m.joined)}</td>
    `;
    body.appendChild(tr);
  });
}

async function loadGuildMembers() {
  const body = document.getElementById("members-body");
  const counter = document.getElementById("member-count-label");
  const pill = document.getElementById("members-status-pill");
  if (!body) return;

  body.innerHTML = "";
  pill.textContent = "Lade…";

  try {
    const res = await fetch("/api/guild-members");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const members = data.members || data || [];
    guildMembers = members;

    counter.textContent = members.length;
    initMemberRankFilter();
    memberSortMode = "name";
    memberRankFilter = "all";
    renderMemberTable();

    pill.textContent = "Geladen";
  } catch (err) {
    console.error(err);
    pill.textContent = "Fehler";
    body.innerHTML = `<tr><td colspan="3">Fehler beim Laden der Mitglieder.</td></tr>`;
  }
}

/* GUILD INFO */

async function loadGuildInfo() {
  const nameEl = document.getElementById("guild-name");
  const tagEl = document.getElementById("guild-tag");
  const levelEl = document.getElementById("guild-level");
  const levelPill = document.getElementById("guild-level-pill");
  const memberCountEl = document.getElementById("guild-member-count");
  const memberPill = document.getElementById("guild-member-pill");
  const motdEl = document.getElementById("guild-motd");

  try {
    const res = await fetch("/api/guild-info");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.name) nameEl.textContent = data.name;
    if (data.tag) tagEl.textContent = `[${data.tag}] • Käsekuchen für alle.`;

    const level = data.level ?? data.guild_level ?? null;
    if (level != null) {
      levelEl.textContent = level;
      levelPill.textContent = `Lvl ${level}`;
    }

    const members = data.member_count ?? data.members ?? null;
    if (members != null) {
      memberCountEl.textContent = members;
      memberPill.textContent = `${members} Mitglieder`;
    }

    if (data.motd) {
      motdEl.textContent = data.motd;
    } else {
      motdEl.textContent = "Keine MOTD gesetzt.";
    }
  } catch (err) {
    console.error(err);
    motdEl.textContent = "Fehler beim Laden der Gildeninfos.";
  }
}

/* GUILD HALL */

async function loadGuildHall() {
  const hallNameEl = document.getElementById("guild-hall-name");
  const hallLevelEl = document.getElementById("guild-hall-level");
  const pill = document.getElementById("guild-hall-status-pill");
  if (!hallNameEl) return;

  pill.textContent = "Lade…";

  try {
    const res = await fetch("/api/guild-hall");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    hallNameEl.textContent = data.hall || "Unbekannt";
    hallLevelEl.textContent = data.level != null ? data.level : "–";
    pill.textContent = "Geladen";
  } catch (err) {
    console.error(err);
    pill.textContent = "Fehler";
    hallNameEl.textContent = "Fehler beim Laden.";
  }
}

/* GUILD LOG */

function formatLogEntry(entry) {
  if (!entry || !entry.type) return "Unbekannter Log-Eintrag";

  const time = entry.time ? formatDate(entry.time) : "";
  const user = entry.user || entry.invited_by || "";
  const target = entry.member || entry.kicked_by || ``;

  let action = entry.type;
  switch (entry.type) {
    case "joined":
      action = `${entry.user} ist der Gilde beigetreten`;
      break;
    case "kick":
      action = `${entry.user} wurde von ${entry.kicked_by} gekickt`;
      break;
    case "rank_change":
      action = `${entry.user} → Rang geändert zu ${entry.new_rank}`;
      break;
    case "motd":
      action = `${user} hat die MOTD geändert`;
      break;
    case "treasury":
      action = `${user} hat etwas in die Treasury eingezahlt/entnommen`;
      break;
    default:
      action = `${entry.type} – ${user || target}`;
  }

  return time ? `${time} – ${action}` : action;
}

async function loadGuildLog() {
  const list = document.getElementById("guild-log-list");
  const status = document.getElementById("guild-log-status");
  if (!list) return;

  list.innerHTML = "";
  status.textContent = "Lade…";

  try {
    const res = await fetch("/api/guild-log");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const filtered = (data.log || data || []).filter(
      (e) => e.type !== "invited"
    );

    if (!filtered.length) {
      list.innerHTML =
        "<li>Keine Log-Einträge (oder alle ausgefiltert).</li>";
    } else {
      filtered.forEach((e) => {
        const li = document.createElement("li");
        li.textContent = formatLogEntry(e);
        list.appendChild(li);
      });
    }

    status.textContent = `Geladen (${filtered.length})`;
  } catch (err) {
    console.error(err);
    status.textContent = "Fehler";
    list.innerHTML = "<li>Fehler beim Laden des Gildenlogs.</li>";
  }
}

/* TREASURY */

async function loadGuildTreasury() {
  const summaryEl = document.getElementById("treasury-summary");
  const pill = document.getElementById("treasury-status-pill");
  if (!summaryEl) return;

  pill.textContent = "Lade…";
  summaryEl.textContent = "Lade…";

  try {
    const res = await fetch("/api/guild-treasury");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const t = data.treasury || data || [];
    if (!Array.isArray(t) || !t.length) {
      summaryEl.textContent = "Keine Treasury-Daten verfügbar.";
    } else {
      const uniqueItems = new Set(t.map((x) => x.item_id));
      summaryEl.textContent = `${t.length} Einträge, ${uniqueItems.size} unterschiedliche Items`;
    }

    pill.textContent = "Geladen";
  } catch (err) {
    console.error(err);
    pill.textContent = "Fehler";
    summaryEl.textContent = "Fehler beim Laden der Treasury.";
  }
}

/* ACCOUNTS */

async function loadAccounts() {
  const grid = document.getElementById("accounts-grid");
  const pill = document.getElementById("accounts-status-pill");
  if (!grid) return;

  pill.textContent = "Lade…";
  grid.innerHTML = "";

  try {
    const res = await fetch("/api/accounts");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      grid.innerHTML =
        "<div class='account-card'>Keine Accounts verknüpft.</div>";
    } else {
      data.forEach((acc) => {
        const div = document.createElement("div");
        div.className = "account-card";
        div.innerHTML = `
          <div class="acc-name">${acc.name}</div>
          <div class="acc-world">World: ${acc.world}</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:0.25rem;">
            Key Index: ${acc.keyIndex}
          </div>
        `;
        grid.appendChild(div);
      });
    }

    pill.textContent = "Geladen";
  } catch (err) {
    console.error(err);
    pill.textContent = "Fehler";
    grid.innerHTML =
      "<div class='account-card'>Fehler beim Laden der Accounts.</div>";
  }
}

/* INIT */

document.addEventListener("DOMContentLoaded", () => {
  loadGuildInfo();
  loadGuildMembers();
  loadGuildHall();
  loadGuildLog();
  loadGuildTreasury();
  loadAccounts();

  const rankFilterSelect = document.getElementById("member-rank-filter");
  const sortSelect = document.getElementById("member-sort-select");

  if (rankFilterSelect) {
    rankFilterSelect.addEventListener("change", () => {
      renderMemberTable();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      renderMemberTable();
    });
  }
});
