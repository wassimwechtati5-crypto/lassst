// Shared status logic for index.html + admin.html
// 1) localStorage = works instantly on same browser/phone (no setup needed)
// 2) Supabase = syncs across different devices (fill URL + KEY below to enable)

const SUPABASE_URL = ""; // e.g. "https://xyzcompany.supabase.co"
const SUPABASE_KEY = "sb_publishable_YAxqdWra-SoUDlXluoXivg_EZ0fRtip"; // publishable (anon) key - never put sb_secret_ here

const STATUS_KEY = "barber_status"; // localStorage key: "OPEN" | "CLOSED"

let supabaseClient = null;

// Only create Supabase client when URL looks valid.
// This way the site still works (via localStorage) before Supabase is configured.
try {
  if (
    typeof supabase !== "undefined" &&
    SUPABASE_URL &&
    SUPABASE_URL.startsWith("https://")
  ) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("Supabase not configured - using localStorage only.");
  }
} catch (e) {
  console.warn("Supabase init failed, using localStorage only:", e);
  supabaseClient = null;
}

function getLocalStatus() {
  try {
    const v = localStorage.getItem(STATUS_KEY);
    if (v === "OPEN" || v === "CLOSED") return v;
  } catch (e) {}
  return null;
}

function setLocalStatus(status) {
  try {
    localStorage.setItem(STATUS_KEY, status);
  } catch (e) {}
  // Notify other open tabs on the same browser instantly
  try {
    localStorage.setItem(STATUS_KEY + "_updated_at", String(Date.now()));
  } catch (e) {}
}

// Read from Supabase (returns "OPEN"/"CLOSED" or null)
async function fetchRemoteStatus() {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from("settings")
      .select("status")
      .eq("id", 1)
      .single();
    if (error) {
      console.warn("Load status error:", error);
      return null;
    }
    if (data && (data.status === "OPEN" || data.status === "CLOSED")) {
      return data.status;
    }
    return null;
  } catch (e) {
    console.warn("Load status error:", e);
    return null;
  }
}

// Write to Supabase (returns true on success, false if not configured/failed)
async function pushRemoteStatus(status) {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient
      .from("settings")
      .update({ status: status })
      .eq("id", 1);
    if (error) {
      console.error("Update status error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Update status error:", e);
    return false;
  }
}

// Get current status: Supabase first (if configured), otherwise localStorage.
// Default = "OPEN" when nothing saved yet.
async function getCurrentStatus() {
  const remote = await fetchRemoteStatus();
  if (remote) {
    setLocalStatus(remote);
    return remote;
  }
  return getLocalStatus() || "OPEN";
}

// Save status everywhere: localStorage always, Supabase when configured.
async function saveStatus(status) {
  setLocalStatus(status);
  const ok = await pushRemoteStatus(status);
  return ok;
}
