/*
  BARBER VERSION 1
  =================
  Change the values below to personalize the site.
*/

const barber = {
  name: "BARBER NAME",
  logo: "BN",

  openingText: "Open today · 09:00 — 20:00",

  photo:
    "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=1200&q=85",

  whatsapp: "21612345678",
  instagram: "https://instagram.com/",
  location:
    "https://maps.google.com/?q=Paris%20Barber%20Shop"
};

document.title = `${barber.name} — Barber`;

document.getElementById("barberName").textContent = barber.name;
document.getElementById("logo").textContent = barber.logo;
document.getElementById("barberPhoto").src = barber.photo;

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const statusNote = document.getElementById("statusNote");

function applyStatus(status) {
  const isOpen = status === "OPEN";

  if (isOpen) {
    statusText.textContent = "OPEN";
    statusNote.textContent = barber.openingText;
    statusBadge.style.color = "#22c55e";
    statusBadge.style.background = "rgba(34,197,94,.1)";
    statusBadge.style.borderColor = "rgba(34,197,94,.25)";
  } else {
    statusText.textContent = "CLOSED";
    statusNote.textContent = "Currently closed";
    statusBadge.style.color = "#ef4444";
    statusBadge.style.background = "rgba(239,68,68,.1)";
    statusBadge.style.borderColor = "rgba(239,68,68,.25)";
  }
}

// 1) Show cached value instantly, then fetch PUBLIC value from Supabase
// so every visitor sees the same status set from admin.
if (typeof getLocalStatus === "function") {
  applyStatus(getLocalStatus() || "OPEN");
}

// 2) Then sync with the public source of truth (Supabase)
async function refreshStatus() {
  try {
    if (typeof getCurrentStatus === "function") {
      const status = await getCurrentStatus();
      applyStatus(status);
    }
  } catch (e) {
    console.warn("refreshStatus failed:", e);
  }
}

refreshStatus();

// 3) Live update when admin changes status in another tab (same browser)
window.addEventListener("storage", (e) => {
  if (e.key === "barber_status" || e.key === "barber_status_updated_at") {
    const s = getLocalStatus();
    if (s) applyStatus(s);
  }
});

// 4) Live update across different devices via Supabase Realtime (when configured)
try {
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    supabaseClient
      .channel("settings-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings", filter: "id=eq.1" },
        (payload) => {
          const s = payload && payload.new && payload.new.status;
          if (s === "OPEN" || s === "CLOSED") {
            setLocalStatus(s);
            applyStatus(s);
          } else {
            refreshStatus();
          }
        }
      )
      .subscribe();
  }
} catch (e) {
  console.warn("Realtime subscribe failed:", e);
}

// 5) Fallback polling every 3s (covers realtime disabled / RLS without realtime)
setInterval(refreshStatus, 3000);

document.getElementById("whatsappBtn").href =
  `https://wa.me/${barber.whatsapp}`;

document.getElementById("instagramBtn").href = barber.instagram;
document.getElementById("locationBtn").href = barber.location;

document.getElementById("year").textContent = new Date().getFullYear();
