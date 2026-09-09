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
      success: false,
      error: "ADMIN_KEY is not configured on the server."
    });
  }

  const suppliedKey = req.headers["x-admin-key"];

  if (!suppliedKey || suppliedKey !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
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
      budget_min,
      budget_max,
      bedrooms,
      requirements
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: "Customer name and phone are required."
      });
    }

    const requestId = "REQ-" + Date.now();

    const request = {
      request_id: requestId,
      id: Date.now(),

      name: String(name),
      phone: String(phone),
      email: email || "",

      purpose: purpose || "",

      property_type:
        propertyType ||
        property_type ||
        "",

      areas: areas || "",

      budget_min:
        budgetMin ||
        budget_min ||
        "",

      budget_max:
        budgetMax ||
        budget_max ||
        "",

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
      request_id: requestId,
      matches,
      matchCount: matches.length
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Something went wrong."
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

    const finalOwnerName =
      ownerName ||
      owner_name;

    const finalPhone =
      ownerPhone ||
      phone;

    if (!finalOwnerName || !finalPhone) {
      return res.status(400).json({
        success: false,
        error: "Owner name and phone are required."
      });
    }

    const property = {
      id: Date.now(),

      owner_name: String(finalOwnerName),

      phone: String(finalPhone),

      email:
        ownerEmail ||
        email ||
        "",

      property_type:
        propertyType ||
        property_type ||
        "",

      area:
        area ||
        "",

      price:
        price ||
        "",

      bedrooms:
        bedrooms ||
        "",

      bathrooms:
        bathrooms ||
        "",

      size:
        propertySize ||
        size ||
        "",

      description:
        description ||
        "",

      image:
        image ||
        "",

      verified: 0,

      status: "pending",

      createdAt:
        new Date().toISOString()
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
      error: "Something went wrong."
    });
  }
});

// =========================
// PROPERTY INTEREST
// =========================

app.post("/api/property-interest", (req, res) => {
  try {
    const {
      request_id,
      property_id
    } = req.body;

    if (!request_id || !property_id) {
      return res.status(400).json({
        success: false,
        error:
          "Request ID and property ID are required."
      });
    }

    // Find customer request
    const request =
      propertyRequests.find(
        r =>
          String(r.request_id) ===
          String(request_id)
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found."
      });
    }

    // Find property
    const property =
      properties.find(
        p =>
          Number(p.id) ===
          Number(property_id)
      );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found."
      });
    }

    // Only verified properties can be requested
    if (Number(property.verified) !== 1) {
      return res.status(400).json({
        success: false,
        error:
          "This property has not been verified yet."
      });
    }

    // Prevent duplicate requests
    const alreadyRequested =
      interests.find(
        i =>
          String(i.request_id) ===
            String(request_id) &&
          Number(i.property_id) ===
            Number(property_id)
      );

    if (alreadyRequested) {
      return res.status(409).json({
        success: false,
        error:
          "You have already requested this property."
      });
    }

    // Create interest record
    const interest = {
      id: Date.now(),

      request_id:
        request.request_id,

      property_id:
        property.id,

      // Customer
      customer_name:
        request.name,

      customer_phone:
        request.phone,

      customer_email:
        request.email || "",

      // Property
      property_type:
        property.property_type,

      area:
        property.area,

      price:
        property.price,

      bedrooms:
        property.bedrooms,

      // Owner
      owner_name:
        property.owner_name,

      owner_phone:
        property.phone,

      owner_email:
        property.email || "",

      status: "new",

      createdAt:
        new Date().toISOString()
    };

    interests.push(interest);

    res.status(201).json({
      success: true,

      message:
        "Property interest submitted successfully.",

      interest
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Something went wrong."
    });
  }
});

// =========================
// PUBLIC APPROVED PROPERTIES
// =========================

app.get(
  "/api/properties/approved",
  (req, res) => {

    const approved =
      properties.filter(
        p =>
          Number(p.verified) === 1
      );

    res.json({
      success: true,
      properties: approved
    });
  }
);

// =========================
// MATCHING ENGINE
// =========================

function findMatches(request) {

  return properties

    .filter(
      p =>
        Number(p.verified) === 1
    )

    .map(property => {

      let score = 0;

      const reasons = [];

      // =========================
      // PROPERTY TYPE
      // =========================

      if (
        request.property_type &&
        property.property_type &&
        String(
          request.property_type
        ).toLowerCase() ===
          String(
            property.property_type
          ).toLowerCase()
      ) {

        score += 30;

        reasons.push(
          "Property type matches"
        );
      }

      // =========================
      // AREA
      // =========================

      if (
        request.areas &&
        property.area
      ) {

        const requestedAreas =
          String(request.areas)
            .toLowerCase()
            .split(",")
            .map(
              x => x.trim()
            )
            .filter(Boolean);

        const propertyArea =
          String(property.area)
            .toLowerCase();

        if (
          requestedAreas.some(
            area =>
              propertyArea.includes(
                area
              )
          )
        ) {

          score += 30;

          reasons.push(
            "Area matches"
          );
        }
      }

      // =========================
      // BUDGET
      // =========================

      const maxBudget =
        Number(
          request.budget_max
       
