// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

const GW2_API_KEY = process.env.GW2_API_KEY;
const GUILD_NAME = process.env.GUILD_NAME || 'Käsekuchen.EV';
const PORT = process.env.PORT || 3000;

// Basis-URL der offiziellen GW2-API
const GW2_API_BASE = 'https://api.guildwars2.com/v2';

if (!GW2_API_KEY) {
  console.warn('⚠️  Warnung: Keine GW2_API_KEY in .env gesetzt. Authentifizierte Guild-Endpoints werden nicht funktionieren.');
}

app.use(cors());
app.use(express.json());

// Statische Dateien (Frontend) aus dem "public"-Ordner
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Hilfsfunktion: Gilden-ID aus Namen holen
 */
async function fetchGuildId() {
  const url = `${GW2_API_BASE}/guild/search?name=${encodeURIComponent(GUILD_NAME)}`;
  const res = await axios.get(url);
  const ids = res.data;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`Keine Gilde mit dem Namen "${GUILD_NAME}" gefunden.`);
  }

  return ids[0]; // Wenn mehrere Treffer, nimm den ersten
}

/**
 * GET /api/guild-info
 * -> Basisinfos zur Gilde (Name, Tag, Level, MOTD, Membercount …)
 */
app.get('/api/guild-info', async (req, res) => {
  try {
    const guildId = await fetchGuildId();
    const url = `${GW2_API_BASE}/guild/${guildId}`;
    // Dieser Endpoint ist "core" und braucht keinen API-Key
    const gwRes = await axios.get(url);

    res.json({
      id: guildId,
      ...gwRes.data,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'Konnte Gildeninfos nicht laden.', details: err.message });
  }
});

/**
 * GET /api/guild-members
 * -> Mitgliederliste der Gilde (braucht guilds-Scope & API-Key von einem Gildenaccount)
 */
app.get('/api/guild-members', async (req, res) => {
  if (!GW2_API_KEY) {
    return res.status(500).json({ error: 'GW2_API_KEY nicht konfiguriert.' });
  }

  try {
    const guildId = await fetchGuildId();
    const url = `${GW2_API_BASE}/guild/${guildId}/members?access_token=${encodeURIComponent(GW2_API_KEY)}`;

    const gwRes = await axios.get(url);
    // Rückgabe ist typischerweise: [{name, rank, joined, ...}, ...]
    res.json({
      guildId,
      members: gwRes.data,
    });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: 'Konnte Mitgliederliste nicht laden.',
      details: err.response?.data || err.message,
    });
  }
});

// GANZ UNTEN in server.js, nach allen anderen Routen:
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`🚀 Käsekuchen.EV Gildenseite läuft auf http://localhost:${PORT}`);
});
