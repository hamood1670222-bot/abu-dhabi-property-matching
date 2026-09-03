const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-admin-key";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new Database("propertymatch.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

function findMatches(request) {
  const properties = db.prepare(`
    SELECT *
    FROM properties
    WHERE verified = 1
    ORDER BY created_at DESC
  `).all();

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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "PropertyMatch Abu Dhabi",
    status: "online"
  });
});

/* Create property request */

app.post("/api/requests", (req, res) => {
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

    db.prepare(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

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

app.post("/api/properties", (req, res) => {
  try {
    const body = req.body;

    if (!clean(body.owner_name) || !clean(body.phone)) {
      return res.status(400).json({
        success: false,
        error: "Owner name and phone are required."
      });
    }

    const result = db.prepare(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );

    res.status(201).json({
      success: true,
      message: "Property received successfully.",
      property_id: result.lastInsertRowid,
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

app.get("/api/requests/:requestId", (req, res) => {
  try {
    const request = db.prepare(`
      SELECT *
      FROM requests
      WHERE request_id = ?
    `).get(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found."
      });
    }

    const matches = findMatches(request);

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

app.get("/api/matches/:requestId", (req, res) => {
  try {
    const request = db.prepare(`
      SELECT *
      FROM requests
      WHERE request_id = ?
    `).get(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found."
      });
    }

    res.json({
      success: true,
      request_id: request.request_id,
      matches: findMatches(request)
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

app.get("/api/admin/summary", adminOnly, (req, res) => {
  const requests = db.prepare(
    "SELECT COUNT(*) AS count FROM requests"
  ).get().count;

  const properties = db.prepare(
    "SELECT COUNT(*) AS count FROM properties"
  ).get().count;

  const verified = db.prepare(
    "SELECT COUNT(*) AS count FROM properties WHERE verified = 1"
  ).get().count;

  res.json({
    success: true,
    requests,
    properties,
    verified_properties: verified
  });
});

/* Admin requests */

app.get("/api/admin/requests", adminOnly, (req, res) => {
  const requests = db.prepare(`
    SELECT *
    FROM requests
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    requests
  });
});

/* Admin properties */

app.get("/api/admin/properties", adminOnly, (req, res) => {
  const properties = db.prepare(`
    SELECT *
    FROM properties
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    properties
  });
});

/* Update request status */

app.post(
  "/api/admin/requests/:requestId/status",
  adminOnly,
  (req, res) => {

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

    const result = db.prepare(`
      UPDATE requests
      SET status = ?
      WHERE request_id = ?
    `).run(
      status,
      req.params.requestId
    );

    if (!result.changes) {
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
  }
);

/* Verify property */

app.post(
  "/api/admin/verify/:propertyId",
  adminOnly,
  (req, res) => {

    const result = db.prepare(`
      UPDATE properties
      SET verified = 1
      WHERE id = ?
    `).run(req.params.propertyId);

    if (!result.changes) {
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
  }
);

/* Start server */

app.listen(PORT, () => {
  console.log(
    `PropertyMatch Abu Dhabi API running on port ${PORT}`
  );
});
