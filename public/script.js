const photos = [
  { src: "assets/sharp/property-01.jpeg", alt: "Main living room with staircase" },
  { src: "assets/sharp/property-02.jpeg", alt: "Bedroom with black curtains and air conditioner" },
  { src: "assets/sharp/property-03.jpeg", alt: "Marble-style kitchen cabinets" },
  { src: "assets/sharp/property-04.jpeg", alt: "Living area with TV wall and yellow chair" },
  { src: "assets/sharp/property-05.jpeg", alt: "Bathroom shower area" },
  { src: "assets/sharp/property-06.jpeg", alt: "TV wall with air conditioner" },
  { src: "assets/sharp/property-07.jpeg", alt: "Kitchen beside duplex staircase" },
  { src: "assets/sharp/property-08.jpeg", alt: "Kitchen view into the lounge" },
  { src: "assets/sharp/property-09.jpeg", alt: "Additional property view" },
  { src: "assets/sharp/property-10.jpeg", alt: "Additional property view" },
  { src: "assets/sharp/property-11.jpeg", alt: "Additional property view" },
  { src: "assets/sharp/property-12.jpeg", alt: "Additional property view" },
];

const whatsappNumber = "2348126517690";
const storageKey = "damitouch-bookings";
const propertiesKey = "damitouch-properties";
let activePhoto = 0;

const header = document.querySelector("[data-header]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const bookingForm = document.querySelector("[data-booking-form]");
const toast = document.querySelector("[data-toast]");

const setHeaderState = () => {
  header.classList.toggle("scrolled", window.scrollY > 24);
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3400);
};

const getBookings = () => JSON.parse(localStorage.getItem(storageKey) || "[]");

const saveBooking = (booking) => {
  const bookings = [booking, ...getBookings()];
  localStorage.setItem(storageKey, JSON.stringify(bookings));
};

const formatDate = (value) => {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
};

const buildWhatsAppMessage = (booking) => {
  return [
    "Hello DamiTouch Airbnb, I want to book the 2-bedroom duplex.",
    "",
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    `Check-in: ${formatDate(booking.checkin)}`,
    `Check-out: ${formatDate(booking.checkout)}`,
    `Guests: ${booking.guests}`,
    `Preferred booking method: ${booking.method}`,
    `Notes: ${booking.notes || "None"}`,
    "",
    "Listing: 35 Favour Estate, Onitiri, Awori, Abule Egba, Lagos State",
  ].join("\n");
};

const updateLightbox = () => {
  const photo = photos[activePhoto];
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt;
};

const renderPublicProperties = async () => {
  const section = document.querySelector("[data-public-properties-section]");
  const list = document.querySelector("[data-public-properties]");
  if (!section || !list) return;

  // Render Skeleton Loaders
  list.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join('');

  try {
    const response = await fetch('/api/properties');
    if (!response.ok) throw new Error('Failed to fetch properties');
    const properties = await response.json();

    section.hidden = properties.length === 0;
    list.innerHTML = properties
      .map(
        (property) => `
          <article class="property-card">
            ${property.image ? `<img src="${property.image}" alt="${property.name}" />` : ""}
            <div>
              <span>${property.status || "Available"}</span>
              <h3>${property.name}</h3>
              <p>${property.location}</p>
              <strong>${property.price}</strong>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    console.error('Error rendering properties:', error);
  }
};

if (header) {
  window.addEventListener("scroll", setHeaderState, { passive: true });
  setHeaderState();
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    mobileNav.classList.toggle("open");
  });

  mobileNav.addEventListener("click", (event) => {
    if (event.target.matches("a, button")) {
      mobileNav.classList.remove("open");
    }
  });
}

document.querySelectorAll("[data-photo]").forEach((button) => {
  button.addEventListener("click", () => {
    activePhoto = Number(button.dataset.photo);
    updateLightbox();
    lightbox?.showModal();
  });
});

document.querySelector("[data-lightbox-close]")?.addEventListener("click", () => lightbox.close());

document.querySelector("[data-prev-photo]")?.addEventListener("click", () => {
  activePhoto = (activePhoto - 1 + photos.length) % photos.length;
  updateLightbox();
});

document.querySelector("[data-next-photo]")?.addEventListener("click", () => {
  activePhoto = (activePhoto + 1) % photos.length;
  updateLightbox();
});

bookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const booking = Object.fromEntries(formData.entries());
  const submitBtn = bookingForm.querySelector("button[type='submit']");

  if (new Date(booking.checkout) <= new Date(booking.checkin)) {
    showToast("Check-out must be after check-in.");
    return;
  }

  if (submitBtn) submitBtn.classList.add("button-loading");

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(booking)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to submit booking');
    }

    showToast("Booking saved. WhatsApp is opening now.");

    const message = encodeURIComponent(buildWhatsAppMessage(booking));
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
    bookingForm.reset();
    bookingForm.elements.guests.value = 2;
  } catch (error) {
    showToast(error.message || "Failed to save booking. Please try again.");
  } finally {
    if (submitBtn) submitBtn.classList.remove("button-loading");
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
renderPublicProperties();
