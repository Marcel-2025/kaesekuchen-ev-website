require("dotenv").config();
const express = require("express");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

// JSON Parser für API
app.use(express.json());

console.log("🚀 Root-Server geladen (Multi-Version Support)");

// ------------------------------------
//  1) STATIC ROUTES für deine Versionen
// ------------------------------------

const v1Path = path.join(__dirname, "Version 1", "public");
const v2Path = path.join(__dirname, "Version 2", "public");
const v3Path = path.join(__dirname, "Version 3", "public");
const rootPublic = path.join(__dirname, "public");

// jede Version unter eigener Route laden
app.use("/v1", express.static(v1Path));
app.use("/v2", express.static(v2Path));
app.use("/v3", express.static(v3Path));

// Root → lädt Root Umschaltseite
app.use("/", express.static(rootPublic));


// ------------------------------------
//  2) API ROUTES (dein GW2 Code bleibt erhalten)
// ------------------------------------

// Beispiel-API aus deinen bisherigen Versionen
// Du kannst deinen kompletten API-Code einfach hier reinschmeißen.
app.get("/api/guild-info", async (req, res) => {
  try {
    const key = process.env.GW2_API_KEY;
    if (!key) return res.status(400).json({ error: "Kein GW2 API Key gesetzt" });

    const guildID = process.env.GUILD_ID;
    if (!guildID) return res.status(400).json({ error: "Keine GUILD_ID gesetzt" });

    const result = await axios.get(`https://api.guildwars2.com/v2/guild/${guildID}?access_token=${key}`);

    res.json(result.data);
  } catch (err) {
    console.error("Guild Info Error:", err.message);
    res.status(500).json({ error: "Fehler beim Abrufen der Gildendaten" });
  }
});

// Wenn du mehr API-Routen hast → einfach HIER drunter einfügen



// ------------------------------------
//  3) Fallback für nicht gefundene API Routen
// ------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API Route nicht gefunden" });
});


// ------------------------------------
//  4) START
// ------------------------------------

app.listen(PORT, () => {
  console.log(`🔥 Root-Server gestartet auf http://localhost:${PORT}`);
  console.log("📦 Versionen verfügbar:");
  console.log("➡️ /v1");
  console.log("➡️ /v2");
  console.log("➡️ /v3");
  console.log("➡️ / (Switcher)");
});
