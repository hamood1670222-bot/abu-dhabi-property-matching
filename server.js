const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// ADMIN KEY
// =========================

const ADMIN_KEY = process.env.ADMIN_KEY;

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(500).json({
      error: "ADMIN_KEY is not configured on the server."
    });
  }

  const suppliedKey = req.headers["x-admin-key"];

  if (!suppliedKey || suppliedKey !== ADMIN_KEY) {
    return res.status(401).json({
      error: "Invalid admin key."
    });
  }

  next();
}

// =========================
// TEMPORARY DATABASE
// =========================

const propertyRequests = [];
const properties = [];
const interests = [];

// =========================
// HEALTH CHECK
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PropertyMatch Abu Dhabi API is running"
  });
});

// =========================
// CUSTOMER REQUEST
// =========================

app.post("/api/requests", (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      purpose,
      propertyType,
      property_type,
      areas,
      budgetMin,
      budgetMax,
      budget_max,
      bedrooms,
      requirements
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Customer name and phone are required."
      });
    }

    const requestId = "REQ-" + Date.now();

    const request = {
      request_id: requestId,
      id: Date.now(),
      name,
      phone,
      email: email || "",
      purpose: purpose || "",
      property_type: propertyType || property_type || "",
      areas: areas || "",
      budget_min: budgetMin || "",
      budget_max: budgetMax || budget_max || "",
      bedrooms: bedrooms || "",
      requirements: requirements || "",
      status: "received",
      createdAt: new Date().toISOString()
    };

    propertyRequests.push(request);

    const matches = findMatches(request);

    res.status(201).json({
      success: true,
      message: "Property request submitted successfully.",
      request,
      matches,
      matchCount: matches.length
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong."
    });
  }
});

// =========================
// PROPERTY SUBMISSION
// =========================

app.post("/api/properties", (req, res) => {
  try {
    const {
      ownerName,
      owner_name,
      ownerPhone,
      phone,
      ownerEmail,
      email,
      propertyType,
      property_type,
      area,
      price,
      bedrooms,
      bathrooms,
      propertySize,
      size,
      description,
      image
    } = req.body;

    const finalOwnerName = ownerName || owner_name;
    const finalPhone = ownerPhone || phone;

    if (!finalOwnerName || !finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Owner name and phone are required."
      });
    }

    const property = {
      id: Date.now(),
      owner_name: finalOwnerName,
      phone: finalPhone,
      email: ownerEmail || email || "",
      property_type: propertyType || property_type || "",
      area: area || "",
      price: price || "",
      bedrooms: bedrooms || "",
      bathrooms: bathrooms || "",
      size: propertySize || size || "",
      description: description || "",
      image: image || "",
      verified: 0,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    properties.push(property);

    res.status(201).json({
      success: true,
      message:
        "Property submitted successfully and is waiting for verification.",
      property
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong."
    });
  }
});

// =========================
// PUBLIC APPROVED PROPERTIES
// =========================

app.get("/api/properties/approved", (req, res) => {
  const approved = properties.filter(
    p => Number(p.verified) === 1
  );

  res.json({
    success: true,
    properties: approved
  });
});

// =========================
// MATCHING ENGINE
// =========================

function findMatches(request) {
  return properties
    .filter(p => Number(p.verified) === 1)
    .map(property => {

      let score = 0;
      const reasons = [];

      // Property type
      if (
        request.property_type &&
        property.property_type &&
        property.property_type.toLowerCase() ===
          request.property_type.toLowerCase()
      ) {
        score += 30;
        reasons.push("Property type matches");
      }

      // Area
      if (request.areas && property.area) {
        const requestedAreas = String(request.areas)
          .toLowerCase()
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);

        const propertyArea = property.area.toLowerCase();

        if (
          requestedAreas.some(area =>
            propertyArea.includes(area)
          )
        ) {
          score += 30;
          reasons.push("Area matches");
        }
      }

      // Budget
      const maxBudget = Number(request.budget_max);
      const propertyPrice = Number(property.price);

      if (
        maxBudget &&
        propertyPrice &&
        propertyPrice <= maxBudget
      ) {
        score += 25;
        reasons.push("Within budget");
      }

      // Bedrooms
      if (
        request.bedrooms &&
        property.bedrooms &&
        Number(property.bedrooms) >= Number(request.bedrooms)
      ) {
        score += 15;
        reasons.push("Bedroom requirement matches");
      }

      return {
        ...property,
        score,
        reasons
      };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

// =========================
// ADMIN SUMMARY
// =========================

app.get(
  "/api/admin/summary",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      requests: propertyRequests.length,
      properties: properties.length,
      verified_properties: properties.filter(
        p => Number(p.verified) === 1
      ).length
    });
  }
);

// =========================
// ADMIN REQUESTS
// =========================

app.get(
  "/api/admin/requests",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      requests: propertyRequests
    });
  }
);

// =========================
// ADMIN PROPERTIES
// =========================

app.get(
  "/api/admin/properties",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      properties
    });
  }
);

// =========================
// ADMIN MATCHES
// =========================

app.get(
  "/api/admin/matches/:requestId",
  requireAdmin,
  (req, res) => {

    const request = propertyRequests.find(
      r => String(r.request_id) ===
        String(req.params.requestId)
    );

    if (!request) {
      return res.status(404).json({
        error: "Request not found."
      });
    }

    const matches = findMatches(request);

    res.json({
      success: true,
      matches
    });
  }
);

// =========================
// VERIFY PROPERTY
// =========================

app.post(
  "/api/admin/verify/:id",
  requireAdmin,
  (req, res) => {

    const property = properties.find(
      p => Number(p.id) === Number(req.params.id)
    );

    if (!property) {
      return res.status(404).json({
        error: "Property not found."
      });
    }

    property.verified = 1;
    property.status = "approved";
    property.updatedAt =
      new Date().toISOString();

    res.json({
      success: true,
      message: "Property verified successfully.",
      property
    });
  }
);

// =========================
// CHANGE REQUEST STATUS
// =========================

app.post(
  "/api/admin/requests/:requestId/status",
  requireAdmin,
  (req, res) => {

    const request = propertyRequests.find(
      r =>
        String(r.request_id) ===
        String(req.params.requestId)
    );

    if (!request) {
      return res.status(404).json({
        error: "Request not found."
      });
    }

    request.status =
      req.body.status || "received";

    request.updatedAt =
      new Date().toISOString();

    res.json({
      success: true,
      request
    });
  }
);

// =========================
// ADMIN INTERESTS
// =========================

app.get(
  "/api/admin/interests",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      interests
    });
  }
);

// =========================
// CHANGE INTEREST STATUS
// =========================

app.post(
  "/api/admin/interests/:id/status",
  requireAdmin,
  (req, res) => {

    const interest = interests.find(
      i => Number(i.id) ===
        Number(req.params.id)
    );

    if (!interest) {
      return res.status(404).json({
        error: "Interest not found."
      });
    }

    interest.status =
      req.body.status || "new";

    interest.updatedAt =
      new Date().toISOString();

    res.json({
      success: true,
      interest
    });
  }
);

// =========================
// OLD ADMIN DASHBOARD
// =========================

app.get(
  "/api/admin/dashboard",
  requireAdmin,
  (req, res) => {

    res.json({
      success: true,
      statistics: {
        totalProperties: properties.length,
        pendingProperties:
          properties.filter(
            p => p.status === "pending"
          ).length,
        approvedProperties:
          properties.filter(
            p => p.status === "approved"
          ).length,
        totalRequests:
          propertyRequests.length
      },
      properties,
      requests: propertyRequests
    });
  }
);

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log(
    `PropertyMatch API running on port ${PORT}`
  );

  if (ADMIN_KEY) {
    console.log("Admin key is configured.");
  } else {
    console.log(
      "WARNING: ADMIN_KEY is not configured."
    );
  }
});
