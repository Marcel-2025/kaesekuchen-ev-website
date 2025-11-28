// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 3000;
const GW2_API_BASE = 'https://api.guildwars2.com/v2';

// Mehrere Keys unterstützen: GW2_API_KEYS oder Fallback GW2_API_KEY
let GW2_API_KEYS = (process.env.GW2_API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

if (!GW2_API_KEYS.length && process.env.GW2_API_KEY) {
  GW2_API_KEYS = [process.env.GW2_API_KEY.trim()];
}

const GUILD_ID_ENV = process.env.GUILD_ID || null;
// WICHTIG: exakt so wie ingame
const GUILD_NAME = process.env.GUILD_NAME || 'Käsekuchen Ev';

if (!GW2_API_KEYS.length) {
  console.warn('⚠️  Keine GW2 API Keys (GW2_API_KEY oder GW2_API_KEYS) konfiguriert.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Account-Cache (für mehrere Keys / Accounts) ----------
let accountCache = null;

/**
 * Lädt zu jedem API-Key die Accountdaten und cached sie.
 */
async function loadAccounts() {
  if (accountCache) return accountCache;

  const results = [];

  for (let i = 0; i < GW2_API_KEYS.length; i++) {
    const key = GW2_API_KEYS[i];
    try {
      const res = await axios.get(`${GW2_API_BASE}/account`, {
        headers: { Authorization: `Bearer ${key}` },
      });

      results.push({
        id: res.data.id,
        name: res.data.name,
        world: res.data.world,
        keyIndex: i,
        key,
      });
    } catch (err) {
      console.warn(
        'Account-Load-Fehler für Key-Index',
        i,
        err.response?.status || err.message
      );
    }
  }

  accountCache = results;
  return accountCache;
}

/**
 * Account anhand GUID ODER Accountnamen finden.
 */
async function getAccountById(accountId) {
  const accounts = await loadAccounts();
  const acc = accounts.find((a) => a.id === accountId || a.name === accountId);
  if (!acc) {
    throw new Error('Kein Account mit dieser ID oder diesem Namen gefunden.');
  }
  return acc;
}

/**
 * Gilden-ID holen:
 *  1) Wenn GUILD_ID in .env gesetzt ist → direkte Nutzung
 *  2) Sonst über GILDENNAMEN suchen
 */
async function fetchGuildId() {
  if (GUILD_ID_ENV) return GUILD_ID_ENV;

  const url = `${GW2_API_BASE}/guild/search?name=${encodeURIComponent(GUILD_NAME)}`;
  const res = await axios.get(url);
  const ids = res.data;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`Keine Gilde mit dem Namen "${GUILD_NAME}" gefunden.`);
  }

  return ids[0];
}

/**
 * Hilfsfunktion: probiert alle Keys durch, bis einer für Gilden-Endpoints funktioniert.
 */
async function callWithAnyGuildKey(fn) {
  if (!GW2_API_KEYS.length) {
    throw new Error('Keine GW2-API-Keys konfiguriert.');
  }

  let lastError = null;

  for (const key of GW2_API_KEYS) {
    try {
      return await fn(key);
    } catch (err) {
      lastError = err;
      console.warn(
        'Guild-Call Fehler mit Key:',
        err.response?.status || err.message
      );
    }
  }

  throw lastError || new Error('Alle Keys sind für diesen Gilden-Endpunkt fehlgeschlagen.');
}

// ---------- ROUTES ----------

/**
 * GET /api/accounts
 * -> Übersicht über alle Accounts (ohne Keys)
 */
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await loadAccounts();
    res.json(
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        world: a.world,
        keyIndex: a.keyIndex,
      }))
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      error: 'Konnte Accounts nicht laden.',
      details: err.message,
    });
  }
});

/**
 * GET /api/accounts/:accountId/characters
 * -> Charakterliste für einen Account (GUID oder Accountname)
 */
app.get('/api/accounts/:accountId/characters', async (req, res) => {
  const { accountId } = req.params;

  try {
    const acc = await getAccountById(accountId);
    const url = `${GW2_API_BASE}/characters?access_token=${encodeURIComponent(acc.key)}`;
    const gwRes = await axios.get(url);

    res.json({
      account: { id: acc.id, name: acc.name, world: acc.world },
      characters: gwRes.data,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Charaktere für diesen Account nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/accounts/:accountId/characters/:charName
 * -> Charakterdetails
 */
app.get('/api/accounts/:accountId/characters/:charName', async (req, res) => {
  const { accountId, charName } = req.params;

  try {
    const acc = await getAccountById(accountId);
    const url = `${GW2_API_BASE}/characters/${encodeURIComponent(
      charName
    )}?access_token=${encodeURIComponent(acc.key)}`;
    const gwRes = await axios.get(url);

    res.json({
      account: { id: acc.id, name: acc.name, world: acc.world },
      character: gwRes.data,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Charakterdetails nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/guild-info
 * -> Basisinfos zur Gilde (Name, Tag, Level, MOTD, Membercount)
 */
app.get('/api/guild-info', async (req, res) => {
  try {
    const guildId = await fetchGuildId();
    const url = `${GW2_API_BASE}/guild/${guildId}`;
    const gwRes = await axios.get(url);
    res.json({ id: guildId, ...gwRes.data });
  } catch (err) {
    console.error('GUILD INFO ERROR:', err?.response?.data || err.message);
    res.status(500).json({
      error: 'Konnte Gildeninfos nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/guild-members
 * -> Mitgliederliste der Gilde
 */
app.get('/api/guild-members', async (req, res) => {
  try {
    const guildId = await fetchGuildId();

    const members = await callWithAnyGuildKey(async (key) => {
      const url = `${GW2_API_BASE}/guild/${guildId}/members?access_token=${encodeURIComponent(
        key
      )}`;
      const gwRes = await axios.get(url);
      return gwRes.data;
    });

    res.json({ guildId, members });
  } catch (err) {
    console.error('GUILD MEMBERS ERROR:', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Mitgliederliste nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/guild-log
 * -> Gildenlog (Join/Leave/Rank/MOTD etc.)
 */
app.get('/api/guild-log', async (req, res) => {
  try {
    const guildId = await fetchGuildId();

    const log = await callWithAnyGuildKey(async (key) => {
      const url = `${GW2_API_BASE}/guild/${guildId}/log?access_token=${encodeURIComponent(
        key
      )}`;
      const gwRes = await axios.get(url);
      return gwRes.data;
    });

    const limited = Array.isArray(log) ? log.slice(0, 50) : [];
    res.json({ guildId, log: limited });
  } catch (err) {
    console.error('GUILD LOG ERROR:', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Gildenlog nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/guild-hall
 * -> Gildenhalle + Upgrades
 */
app.get('/api/guild-hall', async (req, res) => {
  try {
    const guildId = await fetchGuildId();

    const [guildRes, upgrades] = await Promise.all([
      axios.get(`${GW2_API_BASE}/guild/${guildId}`),
      callWithAnyGuildKey(async (key) => {
        const url = `${GW2_API_BASE}/guild/${guildId}/upgrades?access_token=${encodeURIComponent(
          key
        )}`;
        const gwRes = await axios.get(url);
        return gwRes.data;
      }),
    ]);

    const guild = guildRes.data;

    res.json({
      id: guildId,
      name: guild.name,
      tag: guild.tag,
      level: guild.level,
      hall: guild.hall, // z. B. "LostPrecipice"
      upgrades,
    });
  } catch (err) {
    console.error('GUILD HALL ERROR:', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Gildenhalle nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

/**
 * GET /api/guild-treasury
 * -> Gilden-Treasury (Mats, die für Upgrades gebraucht werden)
 */
app.get('/api/guild-treasury', async (req, res) => {
  try {
    const guildId = await fetchGuildId();

    const treasury = await callWithAnyGuildKey(async (key) => {
      const url = `${GW2_API_BASE}/guild/${guildId}/treasury?access_token=${encodeURIComponent(
        key
      )}`;
      const gwRes = await axios.get(url);
      return gwRes.data;
    });

    res.json({ guildId, treasury });
  } catch (err) {
    console.error('GUILD TREASURY ERROR:', err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Gilden-Treasury nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

// ---------- SPA-Fallback: immer index.html zurückgeben ----------
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Käsekuchen.EV läuft auf http://localhost:${PORT}`);
});
