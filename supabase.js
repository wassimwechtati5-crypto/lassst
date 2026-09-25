// ============================================================
// PUBLIC STATUS SYNC - CONFIG
// Fill these 2 values to make Open/Close visible to EVERYONE.
// Supabase Dashboard > Project Settings > API:
//   - Project URL = https://xyzcompany.supabase.co
//   - anon public key = eyJhbGciOi... (long JWT)  OR  sb_publishable_...
// NEVER use sb_secret_ or service_role key in this frontend file.
// ============================================================
const SUPABASE_URL = "YOUR_PROJECT_URL"; // e.g. "https://xyzcompany.supabase.co"
const SUPABASE_KEY = "YOUR_ANON_PUBLIC_KEY"; // e.g. "eyJhbGciOi..."

const STATUS_KEY = "barber_status"; // localStorage cache key: "OPEN" | "CLOSED"
const TABLE = "settings";
const ROW_ID = 1;

let supabaseClient = null;

function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_URL.includes(".supabase.co") &&
    typeof SUPABASE_KEY === "string" &&
    SUPABASE_KEY.length > 20 &&
    !SUPABASE_KEY.includes("YOUR_")
  );
}

// Only create Supabase client when config looks valid.
// localStorage is used as instant cache, Supabase is the public source of truth.
try {
  if (typeof supabase !== "undefined" && isSupabaseConfigured()) {
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

// Read from Supabase (public - everyone can read). Returns "OPEN"/"CLOSED" or null.
async function fetchRemoteStatus() {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("status")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn("Load status error:", error.message);
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

// Write to Supabase (admin page). Everyone reading index.html sees it.
// Throws with readable message if RLS / network blocks it.
async function pushRemoteStatus(status) {
  if (!supabaseClient) {
    throw new Error("Supabase not configured (URL / anon key missing).");
  }
  try {
    const { error } = await supabaseClient
      .from(TABLE)
      .update({ status: status })
      .eq("id", ROW_ID);
    if (error) {
      console.error("Update status error:", error);
      throw new Error(error.message);
    }
    return true;
  } catch (e) {
    console.error("Update status error:", e);
    throw e;
  }
}

// Get current status: Supabase first (public source of truth), then local cache.
// Default = "OPEN" when nothing saved yet.
async function getCurrentStatus() {
  const remote = await fetchRemoteStatus();
  if (remote) {
    setLocalStatus(remote);
    return remote;
  }
  return getLocalStatus() || "OPEN";
}

// Save status everywhere: Supabase first (so everyone sees it), then local cache.
async function saveStatus(status) {
  if (!isSupabaseConfigured() || !supabaseClient) {
    throw new Error("Supabase not configured. Paste URL + anon key in supabase.js.");
  }
  await pushRemoteStatus(status);
  setLocalStatus(status);
  return true;
}
