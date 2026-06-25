const login = document.querySelector("[data-admin-login]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const passwordForm = document.querySelector("[data-password-form]");
const adminList = document.querySelector("[data-admin-list]");
const propertyForm = document.querySelector("[data-property-form]");
const propertyList = document.querySelector("[data-property-list]");
const errorText = document.querySelector("[data-admin-error]");
const toast = document.querySelector("[data-toast]");

const statBookings = document.querySelector("[data-stat-bookings]");
const statListings = document.querySelector("[data-stat-listings]");

const fileInput = document.querySelector("[data-image-file-input]");
const imagePreview = document.querySelector("[data-image-preview]");
const propertySubmitBtn = document.querySelector("[data-property-submit-btn]");
const clearBookingsBtn = document.querySelector("[data-clear-bookings]");

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const getAdminPassword = () => sessionStorage.getItem("damitouch-admin-password") || "";

const formatDate = (value) => {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`)
  );
};

// Render Skeleton Screen
const renderSkeleton = (element, count = 3) => {
  if (!element) return;
  element.innerHTML = Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join('');
};

const renderAdmin = async () => {
  renderSkeleton(adminList, 3);
  try {
    const response = await fetch('/api/bookings', {
      headers: {
        'x-admin-password': getAdminPassword()
      }
    });
    if (!response.ok) throw new Error('Failed to retrieve bookings');
    const bookings = await response.json();

    // Update statistics
    if (statBookings) {
      statBookings.textContent = bookings.length;
    }

    if (!bookings.length) {
      adminList.innerHTML =
        '<div class="admin-item"><strong>No bookings yet</strong><p>Guest requests submitted will appear here.</p></div>';
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
  } catch (error) {
    console.error('Error rendering bookings:', error);
    adminList.innerHTML = `<div class="admin-item"><strong>Error loading bookings</strong><p>${error.message}</p></div>`;
  }
};

const renderProperties = async () => {
  renderSkeleton(propertyList, 2);
  try {
    const response = await fetch('/api/properties');
    if (!response.ok) throw new Error('Failed to retrieve properties');
    const properties = await response.json();

    // Update statistics
    if (statListings) {
      statListings.textContent = properties.length;
    }

    if (!properties.length) {
      propertyList.innerHTML =
        '<div class="admin-item"><strong>No properties added yet</strong><p>Use the form above to add a property.</p></div>';
      return;
    }

    propertyList.innerHTML = properties
      .map(
        (property) => `
          <article class="admin-item property-admin-item">
            ${property.image ? `<img src="${property.image}" alt="${property.name}" />` : ""}
            <div>
              <strong>${property.name}</strong>
              <p>${property.location}</p>
              <p>${property.price} • <span class="badge ${property.status === 'Booked' ? 'badge-booked' : 'badge-available'}">${property.status || "Available"}</span></p>
              <button type="button" data-remove-property="${property._id}">Remove</button>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    console.error('Error rendering properties:', error);
    propertyList.innerHTML = `<div class="admin-item"><strong>Error loading properties</strong><p>${error.message}</p></div>`;
  }
};

const unlock = () => {
  sessionStorage.setItem("damitouch-admin-unlocked", "true");
  login.hidden = true;
  dashboard.hidden = false;
  renderAdmin();
  renderProperties();
};

if (sessionStorage.getItem("damitouch-admin-unlocked") === "true" && sessionStorage.getItem("damitouch-admin-password")) {
  unlock();
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(passwordForm).get("password");
  const submitBtn = passwordForm.querySelector("button[type='submit']");
  submitBtn.classList.add("button-loading");

  try {
    const response = await fetch('/api/bookings', {
      headers: {
        'x-admin-password': password
      }
    });

    if (!response.ok) {
      throw new Error("Incorrect password.");
    }

    errorText.textContent = "";
    sessionStorage.setItem("damitouch-admin-unlocked", "true");
    sessionStorage.setItem("damitouch-admin-password", password);
    unlock();
  } catch (err) {
    errorText.textContent = err.message || "Incorrect password.";
  } finally {
    submitBtn.classList.remove("button-loading");
  }
});

// Image File Input Preview Listener
fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Property Preview" />`;
      imagePreview.hidden = false;
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.innerHTML = "";
    imagePreview.hidden = true;
  }
});

document.querySelector("[data-clear-bookings]").addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear all booking requests?")) return;
  
  clearBookingsBtn.classList.add("button-loading");
  try {
    const response = await fetch('/api/bookings', {
      method: 'DELETE',
      headers: {
        'x-admin-password': getAdminPassword()
      }
    });

    if (!response.ok) throw new Error('Failed to clear bookings');

    renderAdmin();
    showToast("Saved booking requests cleared.");
  } catch (error) {
    showToast(error.message || "Failed to clear bookings.");
  } finally {
    clearBookingsBtn.classList.remove("button-loading");
  }
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(propertyForm);
  
  if (propertySubmitBtn) {
    propertySubmitBtn.classList.add("button-loading");
  }

  try {
    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: {
        'x-admin-password': getAdminPassword()
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to save property');
    }

    propertyForm.reset();
    if (imagePreview) {
      imagePreview.innerHTML = "";
      imagePreview.hidden = true;
    }
    renderProperties();
    showToast("Property saved.");
  } catch (error) {
    showToast(error.message || "Failed to save property. Please try again.");
  } finally {
    if (propertySubmitBtn) {
      propertySubmitBtn.classList.remove("button-loading");
    }
  }
});

propertyList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-property]");
  if (!button) return;

  const propertyId = button.dataset.removeProperty;
  if (!confirm("Are you sure you want to remove this property?")) return;

  button.classList.add("button-loading");
  try {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': getAdminPassword()
      }
    });

    if (!response.ok) throw new Error('Failed to remove property');

    renderProperties();
    showToast("Property removed.");
  } catch (error) {
    showToast(error.message || "Failed to remove property.");
    button.classList.remove("button-loading");
  }
});
