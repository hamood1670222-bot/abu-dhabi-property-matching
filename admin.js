const API_URL = "https://abu-dhabi-property-matching-4.onrender.com";

let ADMIN_KEY = "";

function login() {
  const key = document.getElementById("adminKey").value.trim();
  const msg = document.getElementById("loginMsg");

  if (!key) {
    msg.textContent = "Please enter the admin key.";
    return;
  }

  ADMIN_KEY = key;

  loadDashboard();
}

async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function loadDashboard() {
  const msg = document.getElementById("loginMsg");

  try {
    const summary = await api("/api/admin/summary");

    document.getElementById("login").style.display = "none";
    document.getElementById("dashboard").style.display = "block";

    document.getElementById("requestCount").textContent =
      summary.requests ?? 0;

    document.getElementById("propertyCount").textContent =
      summary.properties ?? 0;

    document.getElementById("verifiedCount").textContent =
      summary.verified ?? 0;

    await loadRequests();
    await loadProperties();

  } catch (error) {
    ADMIN_KEY = "";
    msg.textContent = "Invalid admin key or server error.";
    console.error(error);
  }
}

async function loadRequests() {
  const box = document.getElementById("requestsBox");

  try {
    const data = await api("/api/admin/requests");

    const requests = Array.isArray(data)
      ? data
      : data.requests || [];

    if (!requests.length) {
      box.innerHTML = "<p>No requests yet.</p>";
      return;
    }

    box.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Purpose</th>
            <th>Property Type</th>
            <th>Areas</th>
            <th>Budget</th>
            <th>Bedrooms</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${requests.map(r => `
            <tr>
              <td>${escapeHtml(r.request_id || r.id)}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.phone)}</td>
              <td>${escapeHtml(r.purpose)}</td>
              <td>${escapeHtml(r.property_type)}</td>
              <td>${escapeHtml(r.areas)}</td>
              <td>${escapeHtml(r.budget_max)}</td>
              <td>${escapeHtml(r.bedrooms)}</td>
              <td>${escapeHtml(r.status || "new")}</td>

              <td>
                <button onclick="changeStatus(${r.id}, 'contacted')">
                  Contacted
                </button>

                <button onclick="changeStatus(${r.id}, 'matched')">
                  Matched
                </button>

                <button onclick="changeStatus(${r.id}, 'closed')">
                  Closed
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

  } catch (error) {
    box.innerHTML =
      `<p class="danger">Could not load requests.</p>`;
    console.error(error);
  }
}

async function loadProperties() {
  const box = document.getElementById("propertiesBox");

  try {
    const data = await api("/api/admin/properties");

    const properties = Array.isArray(data)
      ? data
      : data.properties || [];

    if (!properties.length) {
      box.innerHTML = "<p>No properties yet.</p>";
      return;
    }

    box.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Owner</th>
            <th>Phone</th>
            <th>Type</th>
            <th>Area</th>
            <th>Price</th>
            <th>Bedrooms</th>
            <th>Size</th>
            <th>Verified</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${properties.map(p => `
            <tr>
              <td>${escapeHtml(p.id)}</td>
              <td>${escapeHtml(p.owner_name)}</td>
              <td>${escapeHtml(p.phone)}</td>
              <td>${escapeHtml(p.property_type)}</td>
              <td>${escapeHtml(p.area)}</td>
              <td>${escapeHtml(p.price)}</td>
              <td>${escapeHtml(p.bedrooms)}</td>
              <td>${escapeHtml(p.size)}</td>

              <td>
                ${
                  Number(p.verified) === 1
                    ? '<span class="success">Verified</span>'
                    : '<span class="danger">Not verified</span>'
                }
              </td>

              <td>
                ${
                  Number(p.verified) === 1
                    ? '<span class="success">✓ Done</span>'
                    : `<button onclick="verifyProperty(${p.id})">
                         Verify
                       </button>`
                }
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

  } catch (error) {
    box.innerHTML =
      `<p class="danger">Could not load properties.</p>`;
    console.error(error);
  }
}

async function verifyProperty(id) {
  if (!confirm("Verify this property?")) {
    return;
  }

  try {
    await api(`/api/admin/verify/${id}`, {
      method: "POST"
    });

    alert("Property verified successfully.");

    await loadProperties();
    await refreshSummary();

  } catch (error) {
    alert("Could not verify property.");
    console.error(error);
  }
}

async function changeStatus(id, status) {
  try {
    await api(`/api/admin/requests/${id}/status`, {
      method: "POST",
      body: JSON.stringify({
        status: status
      })
    });

    await loadRequests();

  } catch (error) {
    alert("Could not update request status.");
    console.error(error);
  }
}

async function refreshSummary() {
  try {
    const summary = await api("/api/admin/summary");

    document.getElementById("requestCount").textContent =
      summary.requests ?? 0;

    document.getElementById("propertyCount").textContent =
      summary.properties ?? 0;

    document.getElementById("verifiedCount").textContent =
      summary.verified ?? 0;

  } catch (error) {
    console.error(error);
  }
}

function logout() {
  ADMIN_KEY = "";

  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login").style.display = "block";
  document.getElementById("adminKey").value = "";
  document.getElementById("loginMsg").textContent = "";
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
