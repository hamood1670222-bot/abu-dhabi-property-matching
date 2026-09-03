document.addEventListener("DOMContentLoaded", () => {

  // Temporary backend URL.
  // We will replace this with the Render URL after deployment.
  const API_URL = const API_URL = "https://abu-dhabi-property-matching-4.onrender.com";

  const requestForm = document.getElementById("rf");
  const propertyForm = document.getElementById("pf");

  requestForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(requestForm));

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }

      document.getElementById("requestMsg").innerHTML = `
        <p class="success">
          ✅ Request received successfully!
        </p>
        <p>
          <strong>Your Request ID:</strong>
          <span style="font-size:1.1em">${result.request_id}</span>
        </p>
        <p>
          Save this ID. You will use it to check your request status.
        </p>
        <p>
          <strong>Status:</strong> Received
        </p>
      `;

      requestForm.reset();

    } catch (error) {

      document.getElementById("requestMsg").innerHTML = `
        <p style="color:red">
          ❌ We could not submit your request yet.
        </p>
        <p>Please try again shortly.</p>
      `;

      console.error(error);
    }
  });


  propertyForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(propertyForm));

    try {
      const response = await fetch(`${API_URL}/api/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Property submission failed");
      }

      document.getElementById("propertyMsg").innerHTML = `
        <p class="success">
          ✅ Property received successfully!
        </p>
        <p>
          Thank you. Your property is now pending verification.
        </p>
      `;

      propertyForm.reset();

    } catch (error) {

      document.getElementById("propertyMsg").innerHTML = `
        <p style="color:red">
          ❌ We could not submit the property yet.
        </p>
        <p>Please try again shortly.</p>
      `;

      console.error(error);
    }
  });


  window.checkRequestStatus = async function () {

    const input = document.getElementById("requestStatusId");
    const resultBox = document.getElementById("statusResult");

    if (!input || !resultBox) return;

    const requestId = input.value.trim();

    if (!requestId) {
      resultBox.innerHTML = `
        <p style="color:red">
          Please enter your Request ID.
        </p>
      `;
      return;
    }

    resultBox.innerHTML = `
      <p>🔎 Checking your request...</p>
    `;

    try {

      const response = await fetch(
        `${API_URL}/api/requests/${encodeURIComponent(requestId)}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Request not found");
      }

      const statusNames = {
        received: "Received",
        searching: "Searching for matches",
        match_found: "Match found",
        contacted: "You have been contacted",
        deal_closed: "Deal closed",
        closed: "Closed"
      };

      let matchesHTML = "";

      if (result.matches && result.matches.length > 0) {

        matchesHTML = `
          <h3>Possible Matches</h3>
          ${result.matches.map(property => `
            <div class="match-card">
              <strong>${property.property_type || "Property"}</strong>
              <p>📍 ${property.area || "Abu Dhabi"}</p>
              <p>💰 ${property.price ? property.price.toLocaleString() + " AED" : "Price on request"}</p>
              <p>🛏 ${property.bedrooms || "—"} bedrooms</p>
              <p>📐 ${property.size || "—"} sq ft</p>
              <p><strong>Match score: ${property.score}%</strong></p>
            </div>
          `).join("")}
        `;

      } else {

        matchesHTML = `
          <p>
            We haven't found a suitable verified property yet.
            We will keep searching.
          </p>
        `;
      }

      resultBox.innerHTML = `
        <div class="status-card">

          <h3>Request Status</h3>

          <p>
            <strong>Request ID:</strong>
            ${result.request.request_id}
          </p>

          <p>
            <strong>Status:</strong>
            ${statusNames[result.request.status] || result.request.status}
          </p>

          ${matchesHTML}

        </div>
      `;

    } catch (error) {

      resultBox.innerHTML = `
        <p style="color:red">
          ❌ Request not found.
        </p>
        <p>
          Please check that your Request ID is correct.
        </p>
      `;

      console.error(error);
    }
  };


  window.show = function (id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth"
    });
  };

});
