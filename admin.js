const adminPassword = "DamiTouch2026";
const storageKey = "damitouch-bookings";

const login = document.querySelector("[data-admin-login]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const passwordForm = document.querySelector("[data-password-form]");
const adminList = document.querySelector("[data-admin-list]");
const errorText = document.querySelector("[data-admin-error]");
const toast = document.querySelector("[data-toast]");

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
};

const getBookings = () => JSON.parse(localStorage.getItem(storageKey) || "[]");

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

const unlock = () => {
  sessionStorage.setItem("damitouch-admin-unlocked", "true");
  login.hidden = true;
  dashboard.hidden = false;
  renderAdmin();
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
