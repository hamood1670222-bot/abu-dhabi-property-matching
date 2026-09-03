document.addEventListener("DOMContentLoaded", () => {

  const API_URL = "https://abu-dhabi-property-matching-4.onrender.com";

  const requestForm = document.getElementById("rf");
  const propertyForm = document.getElementById("pf");

  const requestMsg = document.getElementById("requestMsg");
  const propertyMsg = document.getElementById("propertyMsg");


  // ==============================
  // DISPLAY MATCHES
  // ==============================

  function renderMatches(matches) {

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
            ${property.property_type || "Property"}
          </strong>

          <p>📍 ${property.area || "Abu Dhabi"}</p>

          <p>
            💰 ${
              property.price != null
                ? Number(property.price).toLocaleString() + " AED"
                : "Price on request"
            }
          </p>

          <p>
            🛏 ${property.bedrooms ?? "—"} bedrooms
          </p>

          <p>
            📐 ${property.size ?? "—"} sq ft
          </p>

          <p>
            <strong>
              Match score: ${property.score ?? 0}%
            </strong>
          </p>

        </div>
      `).join("")}
    `;
  }


  // ==============================
  // FIND PROPERTY MATCHES
  // ==============================

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

      // STEP 1 — Create request

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


      // STEP 2 — Find matching properties

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


      // STEP 3 — Display results

      requestMsg.innerHTML = `

        <div class="status-card">

          <p class="success">
            ✅ Request received successfully!
          </p>

          <p>
            <strong>Your Request ID:</strong>
            ${result.request_id}
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

          ${renderMatches(matchResult.matches)}

        </div>

      `;


      requestForm.reset();


    } catch (error) {

      requestMsg.innerHTML = `

        <p style="color:red">
          ❌ ${error.message ||
          "We could not submit your request yet."}
        </p>

      `;

      console.error(error);

    } finally {

      button.disabled = false;

      button.textContent =
        "🔎 Find Matches";

    }

  });


  // ==============================
  // SUBMIT PROPERTY
  // ==============================

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
          ❌ ${error.message ||
          "We could not submit the property yet."}
        </p>

      `;

      console.error(error);

    } finally {

      button.disabled = false;

      button.textContent =
        "Submit Property";

    }

  });


  // ==============================
  // CHECK REQUEST STATUS
  // ==============================

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


      const statusNames = {

        received: "Received",

        searching:
          "Searching for matches",

        match_found:
          "Match found",

        contacted:
          "You have been contacted",

        deal_closed:
          "Deal closed",

        closed:
          "Closed"

      };


      resultBox.innerHTML = `

        <div class="status-card">

          <h3>
            Request Status
          </h3>

          <p>
            <strong>Request ID:</strong>
            ${result.request.request_id}
          </p>

          <p>
            <strong>Status:</strong>
            ${
              statusNames[
                result.request.status
              ] ||
              result.request.status
            }
          </p>

          ${renderMatches(
            result.matches
          )}

        </div>

      `;


    } catch (error) {

      resultBox.innerHTML = `

        <p style="color:red">
          ❌ ${error.message ||
          "Request not found."}
        </p>

        <p>
          Please check that your Request ID
          is correct.
        </p>

      `;

      console.error(error);

    }

  };


  // ==============================
  // SMOOTH SCROLL
  // ==============================

  window.show = function (id) {

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth"
      });

  };

});
