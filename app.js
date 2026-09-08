document.addEventListener("DOMContentLoaded", () => {

  const API_URL = "https://abu-dhabi-property-matching-4.onrender.com";

  const requestForm = document.getElementById("rf");
  const propertyForm = document.getElementById("pf");

  const requestMsg = document.getElementById("requestMsg");
  const propertyMsg = document.getElementById("propertyMsg");

  let currentRequestId = "";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeJs(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  function renderMatches(matches, requestId = currentRequestId) {

    if (!matches || matches.length === 0) {
      return `
        <p>
          No suitable verified properties found yet.
          We will keep searching.
        </p>
      `;
    }

    return `
      <h3>🏠 Possible Matches</h3>

      ${matches.map(property => `
        <div class="match-card">

          <strong>
            ${escapeHtml(property.property_type || "Property")}
          </strong>

          <p>
            📍 ${escapeHtml(property.area || "Abu Dhabi")}
          </p>

          <p>
            💰 ${
              property.price != null
                ? Number(property.price).toLocaleString() + " AED"
                : "Price on request"
            }
          </p>

          <p>
            🛏 ${escapeHtml(property.bedrooms ?? "—")} bedrooms
          </p>

          <p>
            📐 ${escapeHtml(property.size ?? "—")} sq ft
          </p>

          <p>
            <strong>
              Match score: ${escapeHtml(property.score ?? 0)}%
            </strong>
          </p>

          ${
            property.features
              ? `<p>✨ ${escapeHtml(property.features)}</p>`
              : ""
          }

          ${
            property.description
              ? `<p>${escapeHtml(property.description)}</p>`
              : ""
          }

          <button
            type="button"
            onclick="requestProperty('${escapeJs(property.id)}','${escapeJs(requestId)}')"
          >
            🏠 Request This Property
          </button>

        </div>
      `).join("")}
    `;
  }

  window.requestProperty = async function(propertyId, requestId) {

    if (!propertyId || !requestId) {
      alert("Missing property or request information.");
      return;
    }

    const buttons = document.querySelectorAll(
      `button[onclick*="'${escapeJs(propertyId)}'"]`
    );

    buttons.forEach(button => {
      button.disabled = true;
      button.textContent = "Submitting...";
    });

    try {

      const response = await fetch(
        `${API_URL}/api/property-interest`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            request_id: requestId,
            property_id: Number(propertyId)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not request this property."
        );
      }

      if (result.already_requested) {
        alert(
          "You already requested this property. Our team will contact you."
        );
      } else {
        alert(
          "✅ Property requested successfully! Our team will contact you."
        );
      }

      buttons.forEach(button => {
        button.textContent = "✅ Property Requested";
      });

    } catch (error) {

      alert(
        error.message ||
        "We could not request this property."
      );

      buttons.forEach(button => {
        button.disabled = false;
        button.textContent = "🏠 Request This Property";
      });

      console.error(error);
    }
  };

  requestForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const button =
      requestForm.querySelector('button[type="submit"]');

    const data =
      Object.fromEntries(new FormData(requestForm));

    button.disabled = true;
    button.textContent = "Finding matches...";

    requestMsg.innerHTML = `
      <p>
        🔎 Finding the best property matches for you...
      </p>
    `;

    try {

      const response = await fetch(
        `${API_URL}/api/requests`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Request failed"
        );
      }

      currentRequestId = result.request_id;

      const matchResponse = await fetch(
        `${API_URL}/api/matches/${encodeURIComponent(
          result.request_id
        )}`
      );

      const matchResult =
        await matchResponse.json();

      if (!matchResponse.ok) {
        throw new Error(
          matchResult.error ||
          "Could not find matches"
        );
      }

      requestMsg.innerHTML = `

        <div class="status-card">

          <p class="success">
            ✅ Request received successfully!
          </p>

          <p>
            <strong>Your Request ID:</strong>
            ${escapeHtml(result.request_id)}
          </p>

          <p>
            <strong>Status:</strong>
            ${
              matchResult.matches &&
              matchResult.matches.length > 0
                ? "Match found"
                : "Searching"
            }
          </p>

          ${renderMatches(
            matchResult.matches,
            result.request_id
          )}

        </div>

      `;

      requestForm.reset();

    } catch (error) {

      requestMsg.innerHTML = `

        <p style="color:red">
          ❌ ${
            escapeHtml(
              error.message ||
              "We could not submit your request yet."
            )
          }
        </p>

      `;

      console.error(error);

    } finally {

      button.disabled = false;

      button.textContent =
        "🔎 Find Matches";

    }

  });

  propertyForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const button =
      propertyForm.querySelector(
        'button[type="submit"]'
      );

    const data =
      Object.fromEntries(
        new FormData(propertyForm)
      );

    button.disabled = true;
    button.textContent = "Submitting...";

    try {

      const response = await fetch(
        `${API_URL}/api/properties`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(data)
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Property submission failed"
        );
      }

      propertyMsg.innerHTML = `

        <p class="success">
          ✅ Property received successfully!
        </p>

        <p>
          Thank you. Your property is now
          pending verification.
        </p>

      `;

      propertyForm.reset();

    } catch (error) {

      propertyMsg.innerHTML = `

        <p style="color:red">
          ❌ ${
            escapeHtml(
              error.message ||
              "We could not submit the property yet."
            )
          }
        </p>

      `;

      console.error(error);

    } finally {

      button.disabled = false;

      button.textContent =
        "Submit Property";

    }

  });

  window.checkRequestStatus = async function () {

    const input =
      document.getElementById(
        "requestStatusId"
      );

    const resultBox =
      document.getElementById(
        "statusResult"
      );

    if (!input || !resultBox) return;

    const requestId =
      input.value.trim();

    if (!requestId) {

      resultBox.innerHTML = `
        <p style="color:red">
          Please enter your Request ID.
        </p>
      `;

      return;
    }

    currentRequestId = requestId;

    resultBox.innerHTML = `
      <p>
        🔎 Checking your request...
      </p>
    `;

    try {

      const response = await fetch(
        `${API_URL}/api/requests/${encodeURIComponent(
          requestId
        )}`
      );

      const result =
        await response.json();

      if (!response.ok) {

        throw new Error(
          result.error ||
          "Request not found"
        );

      }

      resultBox.innerHTML = `

        <div class="status-card">

          <h3>
            Request Status
          </h3>

          <p>
            <strong>Request ID:</strong>
            ${escapeHtml(result.request.request_id)}
          </p>

          <p>
            <strong>Status:</strong>
            ${escapeHtml(
              result.request.status || "received"
            )}
          </p>

          ${renderMatches(
            result.matches,
            requestId
          )}

        </div>

      `;

    } catch (error) {

      resultBox.innerHTML = `

        <p style="color:red">
          ❌ ${
            escapeHtml(
              error.message ||
              "Request not found."
            )
          }
        </p>

        <p>
          Please check that your Request ID
          is correct.
        </p>

      `;

      console.error(error);

    }

  };

  window.show = function (id) {

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth"
      });

  };

});
