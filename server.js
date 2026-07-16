// server.js
// A simple Express API that connects to your Supabase PostGIS database
// and serves your 4 layers (roads, rivers, protected areas, boundary) as GeoJSON.

require('dotenv').config(); // loads variables from your local .env file (your DB connection string)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // pg is the library that lets Node talk to Postgres

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from any website for now — simplest option while you're building/testing.
// Later, once you know your frontend's real URL (e.g. your GitHub Pages link), you can
// lock this down: app.use(cors({ origin: 'https://yourusername.github.io' }))
app.use(cors());

// Connection pool to your Supabase Postgres database.
// DATABASE_URL comes from Supabase: Project Settings -> Database -> Connection string
// (use the "URI" format). Put it in a local .env file (see .env.example), and set it
// as an Environment Variable on Render when you deploy.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL connections
});

// ------------------------------------------------------------------
// CHANGE ME if your geometry column isn't called "geom".
// Check in Supabase's Table Editor — QGIS sometimes names it "wkb_geometry" instead.
// ------------------------------------------------------------------
const GEOM_COLUMN = 'wkb_geometry';

// Helper function: runs a query against a given table and returns a proper
// GeoJSON FeatureCollection. ST_AsGeoJSON() converts PostGIS geometry into
// GeoJSON text, which we then wrap into a FeatureCollection ourselves.
async function getLayerAsGeoJSON(tableName) {
  const query = `
    SELECT *, ST_AsGeoJSON(${GEOM_COLUMN}) AS geojson_geom
    FROM ${tableName};
  `;
  const result = await pool.query(query);

  const features = result.rows.map((row) => {
    // pull the raw geometry columns out, keep everything else as "properties"
    const { geojson_geom, [GEOM_COLUMN]: rawGeom, ...properties } = row;
    return {
      type: 'Feature',
      geometry: JSON.parse(geojson_geom),
      properties
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

// ------------------------------------------------------------------
// ROUTES — one per layer. CHANGE the table name string below (e.g. 'roads')
// if you named your Supabase tables differently.
// ------------------------------------------------------------------

//app.get('/api/roads', async (req, res) => {
//  try {
//    res.json(await getLayerAsGeoJSON('roads'));
//  } catch (err) {
//    console.error(err);
//    res.status(500).json({ error: 'Failed to fetch roads' });
//  }
//});

app.get('/api/rivers', async (req, res) => {
  try {
    res.json(await getLayerAsGeoJSON('rivers'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rivers' });
  }
});

// app.get('/api/protected-areas', async (req, res) => {
//   try {
//     res.json(await getLayerAsGeoJSON('protected_areas'));
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch protected areas' });
//   }
// });

app.get('/api/boundary', async (req, res) => {
  try {
    res.json(await getLayerAsGeoJSON('boundary'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch boundary' });
  }
});

// Just so visiting the root URL shows something useful instead of an error
app.get('/', (req, res) => {
  res.send(
    'Islamabad GIS API is running. Try /api/rivers, /api/boundary'
    //'Islamabad GIS API is running. Try /api/roads, /api/rivers, /api/protected-areas, /api/boundary'
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});