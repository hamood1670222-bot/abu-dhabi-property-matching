const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Temporary in-memory data
// Later we can connect this to a real database.
const propertyRequests = [];
const properties = [];

/* =========================
   HOME / HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PropertyMatch Abu Dhabi API is running",
  });
});

/* =========================
   CUSTOMER PROPERTY REQUEST
========================= */

app.post("/api/requests", (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      propertyType,
      areas,
      budgetMin,
      budgetMax,
      bedrooms,
      requirements,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Customer name and phone are required.",
      });
    }

    const request = {
      id: Date.now(),
      name,
      phone,
      email: email || "",
      propertyType: propertyType || "",
      areas: areas || "",
      budgetMin: budgetMin || "",
      budgetMax: budgetMax || "",
      bedrooms: bedrooms || "",
      requirements: requirements || "",
      createdAt: new Date().toISOString(),
    };

    propertyRequests.push(request);

    // Find matching properties
    const matches = properties.filter((property) => {
      let match = true;

      // Property type
      if (
        propertyType &&
        property.propertyType &&
        property.propertyType.toLowerCase() !==
          propertyType.toLowerCase()
      ) {
        match = false;
      }

      // Area
      if (areas && property.area) {
        const requestedAreas = areas
          .toLowerCase()
          .split(",")
          .map((x) => x.trim());

        const propertyArea = property.area.toLowerCase();

        const areaMatch = requestedAreas.some((area) =>
          propertyArea.includes(area)
        );

        if (!areaMatch) {
          match = false;
        }
      }

      // Minimum budget
      if (budgetMin && property.price) {
        if (Number(property.price) < Number(budgetMin)) {
          match = false;
        }
      }

      // Maximum budget
      if (budgetMax && property.price) {
        if (Number(property.price) > Number(budgetMax)) {
          match = false;
        }
      }

      // Bedrooms
      if (bedrooms && property.bedrooms) {
        if (Number(property.bedrooms) < Number(bedrooms)) {
          match = false;
        }
      }

      return match;
    });

    res.status(201).json({
      success: true,
      message: "Property request submitted successfully.",
      request,
      matches,
      matchCount: matches.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while submitting the request.",
    });
  }
});

/* =========================
   SUBMIT PROPERTY
========================= */

app.post("/api/properties", (req, res) => {
  try {
    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      propertyType,
      area,
      price,
      bedrooms,
      bathrooms,
      propertySize,
      description,
      image,
    } = req.body;

    if (!ownerName || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: "Owner name and phone are required.",
      });
    }

    const property = {
      id: Date.now(),
      ownerName,
      ownerPhone,
      ownerEmail: ownerEmail || "",
      propertyType: propertyType || "",
      area: area || "",
      price: price || "",
      bedrooms: bedrooms || "",
      bathrooms: bathrooms || "",
      propertySize: propertySize || "",
      description: description || "",
      image: image || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    properties.push(property);

    res.status(201).json({
      success: true,
      message: "Property submitted successfully and is waiting for approval.",
      property,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while submitting the property.",
    });
  }
});

/* =========================
   GET ALL PROPERTIES
========================= */

app.get("/api/properties", (req, res) => {
  res.json({
    success: true,
    properties,
  });
});

/* =========================
   GET APPROVED PROPERTIES
========================= */

app.get("/api/properties/approved", (req, res) => {
  const approvedProperties = properties.filter(
    (property) => property.status === "approved"
  );

  res.json({
    success: true,
    properties: approvedProperties,
  });
});

/* =========================
   GET ALL CUSTOMER REQUESTS
========================= */

app.get("/api/requests", (req, res) => {
  res.json({
    success: true,
    requests: propertyRequests,
  });
});

/* =========================
   ADMIN DASHBOARD DATA
========================= */

app.get("/api/admin/dashboard", (req, res) => {
  const pendingProperties = properties.filter(
    (property) => property.status === "pending"
  );

  const approvedProperties = properties.filter(
    (property) => property.status === "approved"
  );

  const rejectedProperties = properties.filter(
    (property) => property.status === "rejected"
  );

  res.json({
    success: true,

    statistics: {
      totalProperties: properties.length,
      pendingProperties: pendingProperties.length,
      approvedProperties: approvedProperties.length,
      rejectedProperties: rejectedProperties.length,
      totalRequests: propertyRequests.length,
    },

    properties,
    requests: propertyRequests,
  });
});

/* =========================
   APPROVE PROPERTY
========================= */

app.put("/api/properties/:id/approve", (req, res) => {
  const id = Number(req.params.id);

  const property = properties.find(
    (item) => item.id === id
  );

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found.",
    });
  }

  property.status = "approved";
  property.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: "Property approved successfully.",
    property,
  });
});

/* =========================
   REJECT PROPERTY
========================= */

app.put("/api/properties/:id/reject", (req, res) => {
  const id = Number(req.params.id);

  const property = properties.find(
    (item) => item.id === id
  );

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found.",
    });
  }

  property.status = "rejected";
  property.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: "Property rejected.",
    property,
  });
});

/* =========================
   DELETE PROPERTY
========================= */

app.delete("/api/properties/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = properties.findIndex(
    (property) => property.id === id
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Property not found.",
    });
  }

  const deletedProperty = properties.splice(index, 1);

  res.json({
    success: true,
    message: "Property deleted successfully.",
    property: deletedProperty[0],
  });
});

/* =========================
   DELETE CUSTOMER REQUEST
========================= */

app.delete("/api/requests/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = propertyRequests.findIndex(
    (request) => request.id === id
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Request not found.",
    });
  }

  const deletedRequest = propertyRequests.splice(index, 1);

  res.json({
    success: true,
    message: "Request deleted successfully.",
    request: deletedRequest[0],
  });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`PropertyMatch API running on port ${PORT}`);
});
