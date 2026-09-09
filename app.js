document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://abu-dhabi-property-matching-4.onrender.com";

  const requestForm = document.getElementById("rf");
  const propertyForm = document.getElementById("pf");

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
      .replace(/'/g, "\\'");
  }

  function showMessage(id, message, success = true) {
    const el = document.getElementById(id);

    if (!el) return;

    el.textContent = message;
    el.style.color = success ? "green" : "crimson";
  }

  /* SHOW / HIDE SECTIONS */
  window.show = function (sectionId) {
    const section = document.getElementById(sectionId);

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setTimeout(() => {
      const firstInput = section.querySelector(
        "input, select, textarea"
      );

      if (firstInput) {
        firstInput.focus();
      }
    }, 500);
  };

  /* CUSTOMER REQUEST */
  requestForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = new FormData(requestForm);
    const data = Object.fromEntries(form.entries());

    showMessage(
      "requestMsg",
      "Finding your best property matches...",
      true
    );

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to create your request."
        );
      }

      currentRequestId =
        result.request_id ||
        result.requestId ||
        result.request?.request_id ||
        "";

      showMessage(
        "requestMsg",
        `Request received successfully. Your Request ID is ${currentRequestId}.`,
        true
      );

      if (result.matches) {
        renderMatches(result.matches, currentRequestId);
      } else if (currentRequestId) {
        await loadMatches(currentRequestId);
      }
    } catch (error) {
      console.error(error);

      showMessage(
        "requestMsg",
        error.message ||
          "Something went wrong. Please try again.",
        false
      );
    }
  });

  /* LOAD MATCHES */
  async function loadMatches(requestId) {
    try {
      const response = await fetch(
        `${API_URL}/api/requests/${encodeURIComponent(requestId)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load matches."
        );
      }

      renderMatches(result.matches || [], requestId);
    } catch (error) {
      console.error(error);

      showMessage(
        "requestMsg",
        error.message ||
          "Unable to load matches.",
        false
      );
    }
  }

  /* MATCH CARDS */
  function renderMatches(matches, requestId) {
    let box = document.getElementById("matchesBox");

    if (!box) {
      box = document.createElement("div");
      box.id = "matchesBox";

      const requestSection =
        requestForm?.closest(".panel") ||
        requestForm?.parentElement ||
        document.body;

      requestSection.insertAdjacentElement(
        "afterend",
        box
      );
    }

    if (!matches || matches.length === 0) {
      box.innerHTML = `
        <section class="panel">
          <h2>🔎 Your Matches</h2>
          <p>No verified properties match your request yet.</p>
          <p>
            Your request is saved and we'll keep looking
            as new properties are added.
          </p>
        </section>
      `;

      return;
    }

    box.innerHTML = `
      <section class="panel">
        <h2>🏠 Your Property Matches</h2>

        <p>
          We found ${matches.length}
          ${matches.length === 1 ? "property" : "properties"}
          that may suit your request.
        </p>

        <div class="cards">
          ${matches
            .map((property) => {
              const propertyId = property.id;

              const score =
                property.match_score ??
                property.score ??
                property.matchScore ??
                0;

              const type =
                property.property_type ||
                property.type ||
                "Property";

              const area =
                property.area ||
                property.location ||
                property.community ||
                "Abu Dhabi";

              const bedrooms =
                property.bedrooms ??
                property.beds ??
                "";

              const bathrooms =
                property.bathrooms ??
                property.baths ??
                "";

              const price =
                property.price ??
                property.monthly_rent ??
                property.rent ??
                "";

              return `
                <article class="match-card">

                  <div class="match-score">
                    ${escapeHtml(score)}% Match
                  </div>

                  <h3>
                    ${escapeHtml(type)}
                  </h3>

                  <p>
                    <strong>📍 Area:</strong>
                    ${escapeHtml(area)}
                  </p>

                  ${
                    price !== ""
                      ? `
                        <p>
                          <strong>💰 Price:</strong>
                          AED ${escapeHtml(price)}
                        </p>
                      `
                      : ""
                  }

                  ${
                    bedrooms !== ""
                      ? `
                        <p>
                          <strong>🛏 Bedrooms:</strong>
                          ${escapeHtml(bedrooms)}
                        </p>
                      `
                      : ""
                  }

                  ${
                    bathrooms !== ""
                      ? `
                        <p>
                          <strong>🚿 Bathrooms:</strong>
                          ${escapeHtml(bathrooms)}
                        </p>
                      `
                      : ""
                  }

                  <button
                    type="button"
                    class="request-property-btn"
                    onclick="requestProperty('${escapeJs(
                      propertyId
                    )}', '${escapeJs(requestId)}', this)"
                  >
                    🏠 Request This Property
                  </button>

                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  /* REQUEST PROPERTY */
  window.requestProperty = async (
    propertyId,
    requestId,
    button
  ) => {
    if (!requestId) {
      alert(
        "Your Request ID is missing. Please submit a new request."
      );
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Sending Request...";
    }

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

      if (response.status === 409) {
        alert(
          "You have already requested this property. Our team will contact you."
        );

        if (button) {
          button.disabled = true;
          button.textContent = "✓ Already Requested";
        }

        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to send your property request."
        );
      }

      alert(
        "✅ Property requested successfully!\n\nOur team will contact you and arrange the next steps."
      );

      if (button) {
        button.disabled = true;
        button.textContent = "✓ Requested";
      }
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Something went wrong while requesting this property."
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          "🏠 Request This Property";
      }
    }
  };

  /* PROPERTY SUBMISSION */
  propertyForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = new FormData(propertyForm);
    const data = Object.fromEntries(form.entries());

    showMessage(
      "propertyMsg",
      "Submitting property...",
      true
    );

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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to submit property."
        );
      }

      showMessage(
        "propertyMsg",
        "Property received — pending verification.",
        true
      );

      propertyForm.reset();
    } catch (error) {
      console.error(error);

      showMessage(
        "propertyMsg",
        error.message ||
          "Unable to submit property.",
        false
      );
    }
  });

  /* CHECK REQUEST STATUS */
  window.checkRequestStatus = async function () {
    const input =
      document.getElementById("requestStatusId");

    const resultBox =
      document.getElementById("statusResult");

    if (!input) return;

    const requestId = input.value.trim();

    if (!requestId) {
      if (resultBox) {
        resultBox.textContent =
          "Please enter your Request ID.";
        resultBox.style.color = "crimson";
      }

      return;
    }

    currentRequestId = requestId;

    if (resultBox) {
      resultBox.textContent =
        "Checking your request...";
      resultBox.style.color = "#667085";
    }

    try {
      const response = await fetch(
        `${API_URL}/api/requests/${encodeURIComponent(
          requestId
        )}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Request not found."
        );
      }

      const status =
        result.request?.status ||
        "received";

      if (resultBox) {
        resultBox.innerHTML = `
          <p>
            <strong>Request ID:</strong>
            ${escapeHtml(requestId)}
          </p>

          <p>
            <strong>Status:</strong>
            ${escapeHtml(status)}
          </p>
        `;

        resultBox.style.color = "green";
      }

      renderMatches(
        result.matches || [],
        requestId
      );
    } catch (error) {
      console.error(error);

      if (resultBox) {
        resultBox.textContent =
          error.message ||
          "Unable to check your request.";

        resultBox.style.color = "crimson";
      }
    }
  };
});
