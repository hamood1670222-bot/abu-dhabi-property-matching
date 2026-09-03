const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-admin-key";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      purpose TEXT NOT NULL,
      property_type TEXT NOT NULL,
      areas TEXT,
      budget_max REAL,
      bedrooms INTEGER,
      size_min REAL,
      requirements TEXT,
      status TEXT DEFAULT 'received',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      property_type TEXT NOT NULL,
      area TEXT,
      price REAL,
      bedrooms INTEGER,
      size REAL,
      features TEXT,
      description TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  console.log("PostgreSQL database ready.");
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function numberOrNull(value) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeRequestId() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `PM-${date}-${random}`;
}

async function findMatches(request) {
  const result = await pool.query(`
    SELECT *
    FROM properties
    WHERE verified = 1
    ORDER BY created_at DESC
  `);

  const properties = result.rows;

  const requestedAreas = clean(request.areas)
    .toLowerCase()
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  return properties
    .map(property => {
      let score = 0;
      const reasons = [];

      if (
        clean(request.property_type).toLowerCase() ===
        clean(property.property_type).toLowerCase()
      ) {
        score += 30;
        reasons.push("Property type matches");
      }

      const propertyArea = clean(property.area).toLowerCase();

      if (
        requestedAreas.length === 0 ||
        requestedAreas.some(area =>
          propertyArea.includes(area)
        )
      ) {
        score += 25;
        reasons.push("Area matches");
      }

      if (
        request.budget_max === null ||
        request.budget_max === undefined ||
        property.price === null ||
        property.price <= request.budget_max
      ) {
        score += 20;
        reasons.push("Budget matches");
      }

      if (
        request.bedrooms === null ||
        request.bedrooms === undefined ||
        property.bedrooms === null ||
        property.bedrooms >= request.bedrooms
      ) {
        score += 15;
        reasons.push("Bedrooms match");
      }

      if (
        request.size_min === null ||
        request.size_min === undefined ||
        property.size === null ||
        property.size >= request.size_min
      ) {
        score += 10;
        reasons.push("Size matches");
      }

      return {
        ...property,
        score,
        reasons
      };
    })
    .filter(property => property.score >= 50)
    .sort((a, b) => b.score - a.score);
}

/* Health check */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      service: "PropertyMatch Abu Dhabi",
      status: "online",
      database: "connected"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      service: "PropertyMatch Abu Dhabi",
      status: "online",
      database: "error"
    });
  }
});

/* Create property request */

app.post("/api/requests", async (req, res) => {
  try {
    const body = req.body;

    if (!clean(body.name) || !clean(body.phone)) {
      return res.status(400).json({
        success: false,
        error: "Name and phone are required."
      });
    }

    const requestId = makeRequestId();
    const createdAt = new Date().toISOString();

    await pool.query(`
      INSERT INTO requests (
        request_id,
        name,
        phone,
        email,
        purpose,
        property_type,
        areas,
        budget_max,
        bedrooms,
        size_min,
        requirements,
        status,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
    `, [
      requestId,
      clean(body.name),
      clean(body.phone),
      clean(body.email),
      clean(body.purpose),
      clean(body.property_type),
      clean(body.areas),
      numberOrNull(body.budget_max),
      numberOrNull(body.bedrooms),
      numberOrNull(body.size_min),
      clean(body.requirements),
      "received",
      createdAt
    ]);

    res.status(201).json({
      success: true,
      message: "Request received successfully.",
      request_id: requestId,
      status: "received"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not create request."
    });
  }
});

/* Submit property */

app.post("/api/properties", async (req, res) => {
  try {
    const body = req.body;

    if (!clean(body.owner_name) || !clean(body.phone)) {
      return res.status(400).json({
        success: false,
        error: "Owner name and phone are required."
      });
    }

    const result = await pool.query(`
      INSERT INTO properties (
        owner_name,
        phone,
        email,
        property_type,
        area,
        price,
        bedrooms,
        size,
        features,
        description,
        verified,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING id
    `, [
      clean(body.owner_name),
      clean(body.phone),
      clean(body.email),
      clean(body.property_type),
      clean(body.area),
      numberOrNull(body.price),
      numberOrNull(body.bedrooms),
      numberOrNull(body.size),
      clean(body.features),
      clean(body.description),
      0,
      new Date().toISOString()
    ]);

    res.status(201).json({
      success: true,
      message: "Property received successfully.",
      property_id: result.rows[0].id,
      status: "pending verification"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not submit property."
    });
  }
});

/* Check request status */

app.get("/api/requests/:requestId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM requests
      WHERE request_id = $1
    `, [req.params.requestId]);

    const request = result.rows[0];

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found."
      });
    }

    const matches = await findMatches(request);

    res.json({
      success: true,

      request: {
        request_id: request.request_id,
        name: request.name,
        purpose: request.purpose,
        property_type: request.property_type,
        status: request.status,
        created_at: request.created_at
      },

      matches
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not retrieve request."
    });
  }
});

/* Get matches */

app.get("/api/matches/:requestId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM requests
      WHERE request_id = $1
    `, [req.params.requestId]);

    const request = result.rows[0];

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found."
      });
    }

    const matches = await findMatches(request);

    res.json({
      success: true,
      request_id: request.request_id,
      matches
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not find matches."
    });
  }
});

/* Admin authentication */

function adminOnly(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized."
    });
  }

  next();
}

/* Admin summary */

app.get("/api/admin/summary", adminOnly, async (req, res) => {
  try {
    const requests = await pool.query(
      "SELECT COUNT(*)::int AS count FROM requests"
    );

    const properties = await pool.query(
      "SELECT COUNT(*)::int AS count FROM properties"
    );

    const verified = await pool.query(
      "SELECT COUNT(*)::int AS count FROM properties WHERE verified = 1"
    );

    res.json({
      success: true,
      requests: requests.rows[0].count,
      properties: properties.rows[0].count,
      verified_properties: verified.rows[0].count
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not load summary."
    });
  }
});

/* Admin requests */

app.get("/api/admin/requests", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM requests
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      requests: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not load requests."
    });
  }
});

/* Admin properties */

app.get("/api/admin/properties", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM properties
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      properties: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not load properties."
    });
  }
});

/* Update request status */

app.post(
  "/api/admin/requests/:requestId/status",
  adminOnly,
  async (req, res) => {

    try {
      const allowed = [
        "received",
        "searching",
        "match_found",
        "contacted",
        "deal_closed",
        "closed"
      ];

      const status = clean(req.body.status);

      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status."
        });
      }

      const result = await pool.query(`
        UPDATE requests
        SET status = $1
        WHERE request_id = $2
        RETURNING request_id
      `, [
        status,
        req.params.requestId
      ]);

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          error: "Request not found."
        });
      }

      res.json({
        success: true,
        request_id: req.params.requestId,
        status
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Could not update request status."
      });
    }
  }
);

/* Verify property */

app.post(
  "/api/admin/verify/:propertyId",
  adminOnly,
  async (req, res) => {

    try {
      const result = await pool.query(`
        UPDATE properties
        SET verified = 1
        WHERE id = $1
        RETURNING id
      `, [req.params.propertyId]);

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          error: "Property not found."
        });
      }

      res.json({
        success: true,
        property_id: req.params.propertyId,
        verified: true
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Could not verify property."
      });
    }
  }
);

/* Start server */

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(
        `PropertyMatch Abu Dhabi API running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error("Database startup failed:", error);
    process.exit(1);
  }
}

startServer();
