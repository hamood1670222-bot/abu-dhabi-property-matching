document.addEventListener("DOMContentLoaded", () => {

  const requestForm = document.getElementById("rf");
  const propertyForm = document.getElementById("pf");

  requestForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(requestForm));

    data.created_at = new Date().toISOString();

    const requests = JSON.parse(
      localStorage.getItem("propertymatch_requests") || "[]"
    );

    requests.push(data);

    localStorage.setItem(
      "propertymatch_requests",
      JSON.stringify(requests)
    );

    document.getElementById("requestMsg").innerHTML = `
      <p class="success">
        ✅ Request received! We will look for suitable properties.
      </p>
      <p>Your request has been saved successfully.</p>
    `;

    // Keep the submitted information visible
    // instead of clearing the form.
  });


  propertyForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(propertyForm));

    data.created_at = new Date().toISOString();

    const properties = JSON.parse(
      localStorage.getItem("propertymatch_properties") || "[]"
    );

    properties.push(data);

    localStorage.setItem(
      "propertymatch_properties",
      JSON.stringify(properties)
    );

    document.getElementById("propertyMsg").innerHTML = `
      <p class="success">
        ✅ Property received successfully!
      </p>
      <p>Thank you. We will consider it for matching.</p>
    `;

    // Keep the submitted information visible.
  });


  window.show = function (id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth"
    });
  };

});
