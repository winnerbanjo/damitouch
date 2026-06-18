const photos = [
  { src: "assets/living-room.jpeg", alt: "Main living room with staircase" },
  { src: "assets/bedroom.jpeg", alt: "Bedroom with black curtains and air conditioner" },
  { src: "assets/kitchen-close.jpeg", alt: "Marble-style kitchen cabinets" },
  { src: "assets/lounge-tv.jpeg", alt: "Living area with TV wall and yellow chair" },
  { src: "assets/bathroom.jpeg", alt: "Bathroom shower area" },
  { src: "assets/tv-wall.jpeg", alt: "TV wall with air conditioner" },
  { src: "assets/kitchen-stairs.jpeg", alt: "Kitchen beside duplex staircase" },
  { src: "assets/kitchen-view.jpeg", alt: "Kitchen view into the lounge" },
];

const whatsappNumber = "2348126517690";
const storageKey = "damitouch-bookings";
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

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const booking = Object.fromEntries(formData.entries());
  booking.createdAt = new Date().toISOString();

  if (new Date(booking.checkout) <= new Date(booking.checkin)) {
    showToast("Check-out must be after check-in.");
    return;
  }

  saveBooking(booking);
  showToast("Booking saved. WhatsApp is opening now.");

  const message = encodeURIComponent(buildWhatsAppMessage(booking));
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  bookingForm.reset();
  bookingForm.elements.guests.value = 2;
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
