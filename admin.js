const adminPassword = "DamiTouch2026";
const storageKey = "damitouch-bookings";
const propertiesKey = "damitouch-properties";

const login = document.querySelector("[data-admin-login]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const passwordForm = document.querySelector("[data-password-form]");
const adminList = document.querySelector("[data-admin-list]");
const propertyForm = document.querySelector("[data-property-form]");
const propertyList = document.querySelector("[data-property-list]");
const errorText = document.querySelector("[data-admin-error]");
const toast = document.querySelector("[data-toast]");

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const getBookings = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
const getProperties = () => JSON.parse(localStorage.getItem(propertiesKey) || "[]");

const formatDate = (value) => {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`)
  );
};

const renderAdmin = () => {
  const bookings = getBookings();
  if (!bookings.length) {
    adminList.innerHTML =
      '<div class="admin-item"><strong>No bookings yet</strong><p>Guest requests submitted on this browser will appear here.</p></div>';
    return;
  }

  adminList.innerHTML = bookings
    .map(
      (booking) => `
        <article class="admin-item">
          <strong>${booking.name} • ${booking.guests} guest${Number(booking.guests) === 1 ? "" : "s"}</strong>
          <p>${formatDate(booking.checkin)} to ${formatDate(booking.checkout)}</p>
          <p>${booking.phone} • ${booking.method}</p>
          <p>${booking.notes || "No notes added."}</p>
          <p>Saved: ${new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(booking.createdAt))}</p>
        </article>
      `
    )
    .join("");
};

const renderProperties = () => {
  const properties = getProperties();
  if (!properties.length) {
    propertyList.innerHTML =
      '<div class="admin-item"><strong>No properties added yet</strong><p>Use the form above to save a property on this browser.</p></div>';
    return;
  }

  propertyList.innerHTML = properties
    .map(
      (property, index) => `
        <article class="admin-item property-admin-item">
          ${property.image ? `<img src="${property.image}" alt="${property.name}" />` : ""}
          <div>
            <strong>${property.name}</strong>
            <p>${property.location}</p>
            <p>${property.price} • ${property.status || "Available"}</p>
            <button type="button" data-remove-property="${index}">Remove</button>
          </div>
        </article>
      `
    )
    .join("");
};

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
};

const unlock = () => {
  sessionStorage.setItem("damitouch-admin-unlocked", "true");
  login.hidden = true;
  dashboard.hidden = false;
  renderAdmin();
  renderProperties();
};

if (sessionStorage.getItem("damitouch-admin-unlocked") === "true") {
  unlock();
}

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = new FormData(passwordForm).get("password");
  if (password !== adminPassword) {
    errorText.textContent = "Incorrect password.";
    return;
  }
  errorText.textContent = "";
  unlock();
});

document.querySelector("[data-clear-bookings]").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  renderAdmin();
  showToast("Saved booking requests cleared.");
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(propertyForm);
  const imageFile = formData.get("imageFile");
  const property = Object.fromEntries(formData.entries());
  delete property.imageFile;
  const uploadedImage = await fileToDataUrl(imageFile);
  if (uploadedImage) {
    property.image = uploadedImage;
  }
  const properties = [property, ...getProperties()];
  localStorage.setItem(propertiesKey, JSON.stringify(properties));
  propertyForm.reset();
  renderProperties();
  showToast("Property saved.");
});

propertyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-property]");
  if (!button) return;
  const properties = getProperties();
  properties.splice(Number(button.dataset.removeProperty), 1);
  localStorage.setItem(propertiesKey, JSON.stringify(properties));
  renderProperties();
  showToast("Property removed.");
});
