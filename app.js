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

    document.getElementById("requestMsg").innerHTML =
      '<p class="success">Request submitted successfully! We will look for suitable matches.</p>';

    requestForm.reset();
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

    document.getElementById("propertyMsg").innerHTML =
      '<p class="success">Property submitted successfully!</p>';

    propertyForm.reset();
  });

  window.show = function (id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth"
    });
  };
});
