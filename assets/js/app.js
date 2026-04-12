import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- Page / routing helpers ----------
const PAGE = document.body?.dataset?.page || "index";
const PROTECTED_PAGES = new Set(["listings", "dashboard", "profile"]);
const yearEls = document.querySelectorAll(".year");
yearEls.forEach((el) => (el.textContent = new Date().getFullYear()));

function isDesktopViewport() {
  return window.matchMedia("(min-width: 992px)").matches;
}
function pageUrl(name) {
  return `${name}.html`;
}
function go(name, replace = false) {
  const url = pageUrl(name);
  if (replace) location.replace(url);
  else location.href = url;
}
function syncActiveNav() {
  document.querySelectorAll(".nav-page-link").forEach((a) => {
    const isActive = a.dataset.pageLink === PAGE;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}
syncActiveNav();

const srPolite = document.getElementById("sr-announcer-polite");
const srAssertive = document.getElementById("sr-announcer-assertive");
const resultsSummary = document.getElementById("resultsSummary");
const mapA11yNote = document.getElementById("mapA11yNote");
const btnMapUseList = document.getElementById("btnMapUseList");
const dishSort = document.getElementById("dishSort");
const quickFilterButtons = Array.from(
  document.querySelectorAll("[data-quick-filter]"),
);
const detailsModalEl = document.getElementById("detailsModal");
const detailsModal = detailsModalEl
  ? bootstrap.Modal.getOrCreateInstance(detailsModalEl)
  : null;
const detailsBody = document.getElementById("detailsBody");
const notificationList = document.getElementById("notificationList");
const btnClearNotifications = document.getElementById("btnClearNotifications");
const modalReturnFocus = new Map();

function announce(message, priority = "polite") {
  const text = String(message || "").trim();
  if (!text) return;
  const target = priority === "assertive" ? srAssertive : srPolite;
  if (!target) return;
  target.textContent = "";
  window.setTimeout(() => {
    target.textContent = text;
  }, 25);
}

function focusPageStart() {
  const main = document.getElementById("mainContent");
  const heading = document.getElementById("pageHeading");
  const target = main || heading;
  if (!target) return;
  window.setTimeout(() => {
    try {
      target.focus({ preventScroll: false });
    } catch {
      target.focus();
    }
  }, 0);
}

function firstFocusable(container) {
  return (
    container?.querySelector?.(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || null
  );
}

document.addEventListener("show.bs.modal", (event) => {
  const modalEl = event.target;
  if (modalEl?.id) modalReturnFocus.set(modalEl.id, document.activeElement);
});

document.addEventListener("hide.bs.modal", (event) => {
  const modalEl = event.target;
  const active = document.activeElement;

  if (modalEl && active instanceof HTMLElement && modalEl.contains(active)) {
    active.blur();
  }
});

document.addEventListener("shown.bs.modal", (event) => {
  const modalEl = event.target;
  const target =
    firstFocusable(modalEl?.querySelector(".modal-content")) ||
    modalEl?.querySelector(".modal-title");
  if (!target) return;
  if (target.classList?.contains("modal-title"))
    target.setAttribute("tabindex", "-1");
  window.setTimeout(() => {
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }, 0);
});

document.addEventListener("hidden.bs.modal", (event) => {
  const prev = modalReturnFocus.get(event.target?.id);
  if (prev && typeof prev.focus === "function") {
    window.setTimeout(() => {
      try {
        prev.focus({ preventScroll: true });
      } catch {
        prev.focus();
      }
    }, 0);
  }
});

// ---------- Signposting ----------
const t0 = performance.now();
const dbg = (m, o) =>
  console.debug(
    `[DBG] [${String(Math.round(performance.now() - t0)).padStart(4, " ")}ms] ${m}`,
    o ?? "",
  );
const warn = (m, o) =>
  console.warn(
    `[DBG] [${String(Math.round(performance.now() - t0)).padStart(4, " ")}ms] ${m}`,
    o ?? "",
  );
const err = (m, o) =>
  console.error(
    `[DBG] [${String(Math.round(performance.now() - t0)).padStart(4, " ")}ms] ${m}`,
    o ?? "",
  );

// ---------- Validation helpers ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TEXT_ONLY = {
  titleCatPattern: /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’\-&.,()\/]*$/,
  titleCatInvalidChars: /[^A-Za-zÀ-ÖØ-öø-ÿ\s'’\-&.,()\/]/g,
  descPattern: /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’\-&.,()\/:;!?\n]*$/,
  descInvalidChars: /[^A-Za-zÀ-ÖØ-öø-ÿ\s'’\-&.,()\/:;!?\n]/g,
  usernamePattern: /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s_-]*$/,
  usernameInvalidChars: /[^A-Za-zÀ-ÖØ-öø-ÿ\s_-]/g,
};
function enforceTextOnlyInput(el, invalidCharsRe) {
  if (!el) return;
  const sanitize = () => {
    const before = String(el.value ?? "");
    const after = before.replace(invalidCharsRe, "");
    if (after === before) return;
    const start = el.selectionStart;
    el.value = after;
    if (typeof start === "number") {
      const cleanedPrefix = before.slice(0, start).replace(invalidCharsRe, "");
      const pos = cleanedPrefix.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {}
    }
  };
  el.addEventListener("input", sanitize);
  el.addEventListener("paste", () => setTimeout(sanitize, 0));
}
function setMsg(el, kind, text) {
  if (!el) return;
  const value = text || "";
  el.className = `small text-${kind}`;
  el.textContent = value;
  const assertive = kind === "danger";
  el.setAttribute("role", assertive ? "alert" : "status");
  el.setAttribute("aria-live", assertive ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  if (value) announce(value, assertive ? "assertive" : "polite");
}
function ensureInvalidFeedback(el) {
  if (!el) return null;
  let fb =
    el.parentElement?.querySelector(":scope > .invalid-feedback") ||
    el.parentElement?.querySelector(".invalid-feedback");
  if (!fb) {
    fb = document.createElement("div");
    fb.className = "invalid-feedback";
    el.insertAdjacentElement("afterend", fb);
  }
  if (!fb.id) fb.id = `${el.id || "field"}-error`;
  return fb;
}
function addDescribedBy(el, id) {
  if (!el || !id) return;
  const current = new Set(
    String(el.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean),
  );
  current.add(id);
  el.setAttribute("aria-describedby", Array.from(current).join(" "));
}
function removeDescribedBy(el, id) {
  if (!el || !id) return;
  const current = String(el.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token !== id);
  if (current.length) el.setAttribute("aria-describedby", current.join(" "));
  else el.removeAttribute("aria-describedby");
}
function fieldLabel(el) {
  if (!el?.id) return "Field";
  return (
    document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ||
    "Field"
  );
}
function setInvalid(el, msg) {
  if (!el) return;
  el.classList.add("is-invalid");
  el.setAttribute("aria-invalid", "true");
  const fb = ensureInvalidFeedback(el);
  if (fb) {
    fb.textContent = msg || "Invalid value.";
    addDescribedBy(el, fb.id);
  }
  announce(`${fieldLabel(el)}: ${msg || "Invalid value."}`, "assertive");
}
function clearInvalid(el) {
  if (!el) return;
  el.classList.remove("is-invalid");
  el.removeAttribute("aria-invalid");
  const fb =
    el.parentElement?.querySelector(":scope > .invalid-feedback") ||
    el.parentElement?.querySelector(".invalid-feedback");
  if (fb) {
    fb.textContent = "";
    if (fb.id) removeDescribedBy(el, fb.id);
  }
}
function clearFormInvalid(form) {
  if (!form) return;

  form.querySelectorAll("input, textarea, select").forEach((el) => {
    clearInvalid(el);
  });

  form.querySelectorAll(".invalid-feedback").forEach((fb) => {
    fb.textContent = "";
  });
}
function focusFirstInvalid(form) {
  const first = form?.querySelector(".is-invalid");
  first?.focus?.();
  if (first) announce(`Fix ${fieldLabel(first)} and try again.`, "assertive");
}
function isHttpUrl(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
const V = {
  email(el, label = "Email") {
    const raw = String(el?.value || "").trim();
    if (!raw) return { ok: false, msg: `${label} is required.` };
    if (!EMAIL_RE.test(raw))
      return { ok: false, msg: `Enter a valid ${label.toLowerCase()}.` };
    return { ok: true, value: raw };
  },
  text(el, label, { required = true, min = 1, max = 9999, pattern } = {}) {
    const raw = String(el?.value || "").trim();
    if (required && !raw) return { ok: false, msg: `${label} is required.` };
    if (raw && raw.length < min)
      return { ok: false, msg: `${label} must be at least ${min} characters.` };
    if (raw && raw.length > max)
      return { ok: false, msg: `${label} must be ${max} characters or less.` };
    if (raw && pattern && !pattern.test(raw))
      return { ok: false, msg: `${label} contains invalid characters.` };
    return { ok: true, value: raw };
  },
  number(el, label, { required = true, min = -Infinity, max = Infinity } = {}) {
    const raw = String(el?.value ?? "").trim();
    if (!raw)
      return required
        ? { ok: false, msg: `${label} is required.` }
        : { ok: true, value: null };
    const n = Number(raw);
    if (!Number.isFinite(n))
      return { ok: false, msg: `${label} must be a number.` };
    if (n < min) return { ok: false, msg: `${label} must be at least ${min}.` };
    if (n > max) return { ok: false, msg: `${label} must be ${max} or less.` };
    return { ok: true, value: n };
  },
  int(el, label, { required = true, min = -Infinity, max = Infinity } = {}) {
    const r = V.number(el, label, { required, min, max });
    if (!r.ok) return r;
    if (r.value == null) return r;
    if (!Number.isInteger(r.value))
      return { ok: false, msg: `${label} must be a whole number.` };
    return r;
  },
  url(el, label, { required = false } = {}) {
    const raw = String(el?.value || "").trim();
    if (!raw)
      return required
        ? { ok: false, msg: `${label} is required.` }
        : { ok: true, value: "" };
    if (!isHttpUrl(raw))
      return { ok: false, msg: `${label} must be a valid http(s) URL.` };
    return { ok: true, value: raw };
  },
};
function wireLiveValidation(form) {
  if (!form || form.dataset.liveValidated) return;
  form.dataset.liveValidated = "1";
  form.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", () => clearInvalid(el));
    el.addEventListener("change", () => clearInvalid(el));
  });
}

// ---------- Supabase ----------
const supabaseUrl = "https://povljmmhklcvlvfvhwlp.supabase.co";
// Restore the original anon key exactly from the provided file
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdmxqbW1oa2xjdmx2ZnZod2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDYxNDUsImV4cCI6MjA4MDc4MjE0NX0.zMOLJphJsBbnx7XgNlRxBxKw1iOfIV_1ceYfcyUV_2w";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
const db = supabase.schema("api");

// ---------- Global refs ----------
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMsg = document.getElementById("loginMsg");
const signupForm = document.getElementById("signupForm");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupMsg = document.getElementById("signupMsg");

const profileNameEl = document.getElementById("profileName");
const avatarInitial = document.getElementById("avatarInitial");
const btnSignOut = document.getElementById("btnSignOut");
const authEmailEl = document.getElementById("authEmail");
const fldDbName = document.getElementById("fldDbName");
const fldRole = document.getElementById("fldRole");
const fldAvatarUrl = document.getElementById("fldAvatarUrl");
const fldPickupArea = document.getElementById("fldPickupArea");
const fldBio = document.getElementById("fldBio");
const fldHygieneNote = document.getElementById("fldHygieneNote");
const editMsg = document.getElementById("editMsg");
const fldCurPw = document.getElementById("fldCurPw");
const fldNewPw = document.getElementById("fldNewPw");
const fldNewPw2 = document.getElementById("fldNewPw2");
const btnChangePw = document.getElementById("btnChangePw");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const editProfileModalEl = document.getElementById("editProfileModal");
const editProfileModal = editProfileModalEl
  ? bootstrap.Modal.getOrCreateInstance(editProfileModalEl)
  : null;

const onboardModalEl = document.getElementById("onboardModal");
const onboardModal = onboardModalEl
  ? bootstrap.Modal.getOrCreateInstance(onboardModalEl)
  : null;
const onbName = document.getElementById("onbName");
const onbRole = document.getElementById("onbRole");
const onbMsg = document.getElementById("onbMsg");
const btnOnbSave = document.getElementById("btnOnbSave");

const languageSelect = document.getElementById("languageSelect");
const notifSwitch = document.getElementById("notifSwitch");

const statusEl = document.getElementById("status");
const dishList = document.getElementById("dishList");
const dishSearch = document.getElementById("dishSearch");
const btnOpenFilters = document.getElementById("btnOpenFilters");
const filtersSummary = document.getElementById("filtersSummary");
const filtersModalEl = document.getElementById("filtersModal");
const filtersModal = filtersModalEl
  ? bootstrap.Modal.getOrCreateInstance(filtersModalEl)
  : null;
const fltVeganOnly = document.getElementById("fltVeganOnly");
const fltAllergensWrap = document.getElementById("fltAllergensWrap");
const fltCustomAllergens = document.getElementById("fltCustomAllergens");
const btnApplyFilters = document.getElementById("btnApplyFilters");
const btnClearFilters = document.getElementById("btnClearFilters");

const favsModalEl = document.getElementById("favsModal");
const favsModal = favsModalEl
  ? bootstrap.Modal.getOrCreateInstance(favsModalEl)
  : null;
const favDishList = document.getElementById("favDishList");
document.getElementById("btnFavourites")?.addEventListener("click", () => {
  renderFavsModal();
  favsModal?.show();
});

const ordersDashboard = document.getElementById("ordersDashboard");
const uploadSection = document.getElementById("uploadSection");
const btnHideUpload = document.getElementById("btnHideUpload");
btnHideUpload?.addEventListener("click", () =>
  uploadSection?.classList.add("d-none"),
);

// ---------- Favourites ----------
let FAV_FOOD_IDS = new Set();
let LAST_AUTH_UID = null;
function clearFavsState() {
  FAV_FOOD_IDS = new Set();
  renderFavsIcon();
  document
    .querySelectorAll("[data-fav-food]")
    .forEach((btn) => btn.classList.remove("is-fav"));
  if (favsModalEl?.classList.contains("show")) renderFavsModal();
}
async function refreshFavsFromDb() {
  const me = Number(DBPROFILE?.user_id);
  if (!Number.isFinite(me)) {
    clearFavsState();
    return;
  }
  const { data, error } = await db
    .from("favourites")
    .select("food_id")
    .eq("user_id", me);
  if (error) {
    warn("refreshFavsFromDb error", error);
    clearFavsState();
    return;
  }
  FAV_FOOD_IDS = new Set((data || []).map((r) => String(r.food_id)));
  renderFavsIcon();
}
function isFavFood(foodId) {
  return FAV_FOOD_IDS.has(String(foodId));
}
function syncFavButtons(foodId) {
  const idStr = String(foodId);
  const on = isFavFood(foodId);
  document.querySelectorAll(`[data-fav-food="${idStr}"]`).forEach((btn) => {
    btn.classList.toggle("is-fav", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const label =
      btn.getAttribute("data-fav-label") ||
      btn.getAttribute("aria-label") ||
      "favourite";
    const cleaned = String(label).replace(/^(Unfavourite|Favourite)\s+/i, "");
    btn.setAttribute(
      "aria-label",
      `${on ? "Unfavourite" : "Favourite"} ${cleaned}`.trim(),
    );
  });
}
function parseIsFav(data) {
  if (data == null) return false;
  if (typeof data === "boolean") return data;
  if (typeof data === "number") return data !== 0;
  if (Array.isArray(data)) return parseIsFav(data[0]);
  if (typeof data === "object") {
    if ("is_fav" in data) return !!data.is_fav;
    if ("isFav" in data) return !!data.isFav;
  }
  return false;
}
async function toggleFavFood(foodId) {
  const { data, error } = await db.rpc("toggle_favourite", {
    p_food_id: Number(foodId),
  });
  if (error) {
    console.error("toggle_favourite error", error);
    return { ok: false, is_fav: isFavFood(foodId), error };
  }
  const is_fav = parseIsFav(data);
  if (is_fav) FAV_FOOD_IDS.add(String(foodId));
  else FAV_FOOD_IDS.delete(String(foodId));
  renderFavsIcon();
  syncFavButtons(foodId);
  if (favsModalEl?.classList.contains("show")) renderFavsModal();
  announce(
    is_fav ? "Added to favourites." : "Removed from favourites.",
    "polite",
  );
  return { ok: true, is_fav };
}
function renderFavsIcon() {
  const btn = document.getElementById("btnFavourites");
  if (!btn) return;
  btn.classList.toggle("is-fav", FAV_FOOD_IDS.size > 0);
  btn.setAttribute(
    "aria-label",
    `Open favourites. ${FAV_FOOD_IDS.size} saved item${FAV_FOOD_IDS.size === 1 ? "" : "s"}.`,
  );
}

// ---------- Accessibility / prefs ----------
const AKEY = "gfg_access";
function loadAccess() {
  try {
    const a = JSON.parse(localStorage.getItem(AKEY)) || {};
    return {
      appearance: a.appearance || "light",
      size: a.size || "std",
      bold: !!a.bold,
      sr: !!a.sr,
      reduceMotion: !!a.reduceMotion,
      simpleUI: !!a.simpleUI,
    };
  } catch {
    return {
      appearance: "light",
      size: "std",
      bold: false,
      sr: false,
      reduceMotion: false,
      simpleUI: false,
    };
  }
}
let access = loadAccess();
function applyAccess() {
  document.body.classList.remove(
    "theme-dark",
    "high-contrast",
    "text-large",
    "text-small",
    "bold-text",
    "sr-enhanced",
    "reduce-motion",
    "simple-ui",
  );
  if (access.appearance === "dark") document.body.classList.add("theme-dark");
  if (access.appearance === "highcontrast")
    document.body.classList.add("high-contrast");
  if (access.size === "lg") document.body.classList.add("text-large");
  if (access.size === "sm") document.body.classList.add("text-small");
  if (access.bold) document.body.classList.add("bold-text");
  if (access.sr) document.body.classList.add("sr-enhanced");
  if (access.reduceMotion) document.body.classList.add("reduce-motion");
  if (access.simpleUI) document.body.classList.add("simple-ui");
  const currentLocView = localStorage.getItem("gfg_locations_view") || "list";
  if (mapA11yNote)
    mapA11yNote.classList.toggle(
      "d-none",
      !access.sr || currentLocView !== "map",
    );
  const mapNode = document.getElementById("map");
  if (mapNode)
    mapNode.setAttribute("aria-hidden", access.sr ? "true" : "false");
}
applyAccess();
document
  .getElementById("accessibilityModal")
  ?.addEventListener("show.bs.modal", () => {
    const fldAppearance = document.getElementById("fldAppearance");
    const szStd = document.getElementById("szStd");
    const szLg = document.getElementById("szLg");
    const szSm = document.getElementById("szSm");
    const chkBold = document.getElementById("chkBold");
    const chkSR = document.getElementById("chkSR");
    const chkReduceMotion = document.getElementById("chkReduceMotion");
    const chkSimpleUI = document.getElementById("chkSimpleUI");
    if (fldAppearance) fldAppearance.value = access.appearance;
    if (szStd) szStd.checked = access.size === "std";
    if (szLg) szLg.checked = access.size === "lg";
    if (szSm) szSm.checked = access.size === "sm";
    if (chkBold) chkBold.checked = !!access.bold;
    if (chkSR) chkSR.checked = !!access.sr;
    if (chkReduceMotion) chkReduceMotion.checked = !!access.reduceMotion;
    if (chkSimpleUI) chkSimpleUI.checked = !!access.simpleUI;
  });
document.getElementById("accessForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  access.appearance =
    document.getElementById("fldAppearance")?.value || "light";
  access.size =
    document.querySelector('input[name="txtsize"]:checked')?.value || "std";
  access.bold = !!document.getElementById("chkBold")?.checked;
  access.sr = !!document.getElementById("chkSR")?.checked;
  access.reduceMotion = !!document.getElementById("chkReduceMotion")?.checked;
  access.simpleUI = !!document.getElementById("chkSimpleUI")?.checked;
  localStorage.setItem(AKEY, JSON.stringify(access));
  applyAccess();
  announce("Accessibility settings applied.", "polite");
  bootstrap.Modal.getInstance(
    document.getElementById("accessibilityModal"),
  )?.hide();
});

const PREFKEY = "gfg_prefs";
function loadPrefs() {
  try {
    return (
      JSON.parse(localStorage.getItem(PREFKEY)) ?? {
        language: "English",
        notif: true,
      }
    );
  } catch {
    return { language: "English", notif: true };
  }
}
let prefs = loadPrefs();
function savePrefs() {
  localStorage.setItem(PREFKEY, JSON.stringify(prefs));
}
function syncPrefsUI() {
  if (languageSelect) languageSelect.value = prefs.language || "English";
  if (notifSwitch) notifSwitch.checked = !!prefs.notif;
}
syncPrefsUI();
languageSelect?.addEventListener("change", (e) => {
  prefs.language = e.target.value;
  savePrefs();
});
notifSwitch?.addEventListener("change", (e) => {
  prefs.notif = !!e.target.checked;
  savePrefs();
});

const NOTIF_KEY = "gfg_notifications_v1";
function loadNotifications() {
  try {
    const items = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
let NOTIFICATIONS = loadNotifications();
function saveNotifications() {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(NOTIFICATIONS.slice(0, 40)));
}
function pushNotification(title, body = "", type = "info", meta = {}) {
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    type,
    created_at: new Date().toISOString(),
    unread: true,
    ...meta,
  };
  NOTIFICATIONS.unshift(item);
  saveNotifications();
  renderNotifications();
  if (prefs.notif) announce(title, "polite");
}
function markNotificationsRead() {
  NOTIFICATIONS = NOTIFICATIONS.map((item) => ({ ...item, unread: false }));
  saveNotifications();
  renderNotifications();
}
function renderNotifications() {
  if (!notificationList) return;
  if (!NOTIFICATIONS.length) {
    notificationList.innerHTML =
      '<div class="text-muted small">No notifications yet.</div>';
    return;
  }
  notificationList.innerHTML = NOTIFICATIONS.slice(0, 10)
    .map(
      (n) => `
    <div class="notification-item ${n.unread ? "unread" : ""}">
      <div class="d-flex justify-content-between gap-2 align-items-start">
        <div>
          <div class="fw-semibold">${escHtml(n.title || "Notification")}</div>
          ${n.body ? `<div class="small text-muted mt-1">${escHtml(n.body)}</div>` : ""}
        </div>
        <div class="small text-muted">${new Date(n.created_at).toLocaleString()}</div>
      </div>
    </div>
  `,
    )
    .join("");
}
btnClearNotifications?.addEventListener("click", () => {
  NOTIFICATIONS = [];
  saveNotifications();
  renderNotifications();
  announce("Notifications cleared.", "polite");
});
renderNotifications();
// ---------- DB profile ----------
let DBPROFILE = null;
async function getDbProfile(uid) {
  return await db.from("users_v").select("*").eq("auth_uid", uid).maybeSingle();
}
async function hasBaseProfile(uid) {
  const { data, error } = await db
    .from("users_v")
    .select("user_id")
    .eq("auth_uid", uid)
    .maybeSingle();
  if (error && error.code !== "PGRST116")
    console.warn("hasBaseProfile error", error);
  return !!data?.user_id;
}
function useDbProfileUI(p) {
  DBPROFILE = p;
  const name = p?.user_name || p?.email?.split("@")[0] || "User";
  if (profileNameEl) profileNameEl.textContent = name;
  if (avatarInitial) {
    if (p?.avatar_url) {
      avatarInitial.innerHTML = `<img src="${escHtml(p.avatar_url)}" alt="${escHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
    } else {
      avatarInitial.textContent =
        (name || "U").trim().charAt(0).toUpperCase() || "U";
    }
  }
}
async function upsertProfile({
  uid,
  email,
  user_name,
  user_group,
  avatar_url = "",
  bio = "",
  pickup_area = "",
  hygiene_note = "",
}) {
  const { data: existing } = await db
    .from("users_v")
    .select("user_id")
    .eq("auth_uid", uid)
    .maybeSingle();
  if (existing) {
    return await db
      .from("users_v")
      .update({
        user_name,
        user_group,
        email,
        avatar_url,
        bio,
        pickup_area,
        hygiene_note,
      })
      .eq("auth_uid", uid)
      .select("*")
      .maybeSingle();
  }
  return await db
    .from("users_v")
    .insert({
      auth_uid: uid,
      email,
      user_name,
      user_group,
      avatar_url,
      bio,
      pickup_area,
      hygiene_note,
    })
    .select("*")
    .maybeSingle();
}
const ONBKEY = "gfg_onb_seen_uid";
const getOnbSeenUid = () => localStorage.getItem(ONBKEY) || "";
const setOnbSeenUid = (uid) => localStorage.setItem(ONBKEY, uid);
const clearOnbSeenUid = () => localStorage.removeItem(ONBKEY);

// ---------- Dish / listing helpers ----------
const GBP = (v) => (v == null ? "" : "£" + Number(v).toFixed(2));
let DISHES = [];
const ALLERGENS = [
  { key: "celery", label: "Celery" },
  { key: "gluten", label: "Cereals containing gluten" },
  { key: "crustaceans", label: "Crustaceans" },
  { key: "eggs", label: "Eggs" },
  { key: "fish", label: "Fish" },
  { key: "lupin", label: "Lupin" },
  { key: "milk", label: "Milk" },
  { key: "molluscs", label: "Molluscs" },
  { key: "mustard", label: "Mustard" },
  { key: "nuts", label: "Tree nuts" },
  { key: "peanuts", label: "Peanuts" },
  { key: "sesame", label: "Sesame" },
  { key: "soya", label: "Soya" },
  { key: "sulphites", label: "Sulphur dioxide / sulphites" },
];
const FILTERS_KEY = "gfg_dish_filters_v2";
function defaultDishFilters() {
  return {
    veganOnly: false,
    exclude: [],
    custom: "",
    maxPrice: null,
    nearbyOnly: false,
    pickupOnly: false,
    expiringSoon: false,
    sort: "newest",
  };
}

function normalizeDishFilters(raw) {
  const base = defaultDishFilters();
  const f = raw && typeof raw === "object" ? raw : {};

  const parsedMax = Number(f.maxPrice);

  return {
    ...base,
    veganOnly: !!f.veganOnly,
    exclude: Array.isArray(f.exclude)
      ? f.exclude.map(String).filter(Boolean)
      : [],
    custom: String(f.custom || "").trim(),

    // IMPORTANT:
    // only keep a price filter if it is a real positive number
    // this prevents false/0/'' becoming "Under £0.00"
    maxPrice: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : null,

    nearbyOnly: !!f.nearbyOnly,
    pickupOnly: !!f.pickupOnly,
    expiringSoon: !!f.expiringSoon,
    sort: [
      "newest",
      "nearest",
      "cheapest",
      "highestRated",
      "expiringSoon",
    ].includes(f.sort)
      ? f.sort
      : "newest",
  };
}

function loadDishFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
    return normalizeDishFilters(raw);
  } catch {
    return defaultDishFilters();
  }
}

function saveDishFilters(f) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(normalizeDishFilters(f)));
}

let DISH_FILTERS = loadDishFilters();
function parseTokens(s) {
  return String(s || "")
    .toLowerCase()
    .split(/[,/;|\n]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}
function toBool(v) {
  if (v === true || v === false) return v;
  if (v == null) return false;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (["true", "t", "yes", "y", "1", "on"].includes(s)) return true;
  if (["false", "f", "no", "n", "0", "off"].includes(s)) return false;
  return false;
}
function dishIsVegan(d) {
  return toBool(d?.is_vegan ?? d?.vegan ?? d?.isVegan ?? d?.vegan_dish);
}
function dishAllergensText(d) {
  return (
    d?.allergens_disclosure ??
    d?.allergens ??
    d?.allergensDisclosure ??
    d?.allergen_disclosure ??
    ""
  );
}
function dishPortions(d) {
  const n = Number(d?.portions_available ?? d?.portions ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function dishExpiresAt(d) {
  return d?.expires_at ?? d?.expiry_at ?? d?.expiresAt ?? null;
}

// ===================== Enhanced food column support =====================
let FOOD_ENHANCED_COLUMNS_AVAILABLE = null;

function isMissingEnhancedFoodColumnError(error) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");

  return (
    code === "PGRST204" ||
    msg.includes("could not find the 'ingredients' column") ||
    msg.includes("could not find the 'prep_date' column") ||
    msg.includes("could not find the 'status_note' column") ||
    msg.includes("column food.ingredients does not exist") ||
    msg.includes("column food.prep_date does not exist") ||
    msg.includes("column food.status_note does not exist")
  );
}

function stripEnhancedFoodFields(row) {
  const clone = { ...(row || {}) };
  delete clone.ingredients;
  delete clone.prep_date;
  delete clone.status_note;
  return clone;
}

async function insertFoodRowWithFallback(row) {
  let { data, error } = await db
    .from("food")
    .insert(row)
    .select("food_id, created_at")
    .maybeSingle();

  if (error && isMissingEnhancedFoodColumnError(error)) {
    warn(
      "Enhanced food columns unavailable during insert, retrying without them",
      error,
    );
    FOOD_ENHANCED_COLUMNS_AVAILABLE = false;

    const fallbackRow = stripEnhancedFoodFields(row);

    const retry = await db
      .from("food")
      .insert(fallbackRow)
      .select("food_id, created_at")
      .maybeSingle();

    data = retry.data;
    error = retry.error;
  }

  if (!error && FOOD_ENHANCED_COLUMNS_AVAILABLE !== false) {
    FOOD_ENHANCED_COLUMNS_AVAILABLE = true;
  }

  return { data, error };
}

async function updateFoodRowWithFallback(foodId, payload) {
  let { data, error } = await db
    .from("food")
    .update(payload)
    .eq("food_id", Number(foodId))
    .select("food_id")
    .maybeSingle();

  if (error && isMissingEnhancedFoodColumnError(error)) {
    warn(
      "Enhanced food columns unavailable during update, retrying without them",
      error,
    );
    FOOD_ENHANCED_COLUMNS_AVAILABLE = false;

    const fallbackPayload = stripEnhancedFoodFields(payload);

    const retry = await db
      .from("food")
      .update(fallbackPayload)
      .eq("food_id", Number(foodId))
      .select("food_id")
      .maybeSingle();

    data = retry.data;
    error = retry.error;
  }

  if (!error && FOOD_ENHANCED_COLUMNS_AVAILABLE !== false) {
    FOOD_ENHANCED_COLUMNS_AVAILABLE = true;
  }

  return { data, error };
}

function dishIsArchived(d) {
  return toBool(d?.is_archived ?? d?.archived ?? false);
}
function dishIsExpired(d) {
  const exp = dishExpiresAt(d);
  if (!exp) return false;
  const t = new Date(exp).getTime();
  return Number.isFinite(t) ? t <= Date.now() : false;
}
function timeLeftLabel(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "";
  const mins = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  return `${mins}m`;
}
function normalizeOrderStatus(status) {
  const raw = String(status || "")
    .trim()
    .toLowerCase();
  if (!raw) return "placed";
  return raw.replace(/\s+/g, "_");
}
function labelOrderStatus(status) {
  const s = normalizeOrderStatus(status);
  return (
    {
      placed: "Placed",
      accepted: "Accepted",
      preparing: "Preparing",
      ready: "Ready",
      out_for_delivery: "Out for delivery",
      completed: "Completed",
      cancelled: "Cancelled",
      reported: "Reported",
    }[s] || "Placed"
  );
}
function orderStatusBadge(status) {
  const s = normalizeOrderStatus(status);
  return `<span class="status-pill status-${s}">${escHtml(labelOrderStatus(s))}</span>`;
}
async function enrichDishesFromFoodTable(dishes) {
  const ids = (dishes || [])
    .map((d) => Number(d?.food_id))
    .filter(Number.isFinite);

  if (!ids.length) return dishes;

  let data = null;
  let error = null;

  if (FOOD_ENHANCED_COLUMNS_AVAILABLE === false) {
    const fallback = await db
      .from("food")
      .select(
        "food_id, description, portions_available, is_vegan, allergens_disclosure, is_sold, expires_at, is_archived",
      )
      .in("food_id", ids);

    data = fallback.data;
    error = fallback.error;
  } else {
    const enhanced = await db
      .from("food")
      .select(
        "food_id, description, portions_available, is_vegan, allergens_disclosure, is_sold, expires_at, is_archived, ingredients, prep_date, status_note",
      )
      .in("food_id", ids);

    data = enhanced.data;
    error = enhanced.error;

    if (error && isMissingEnhancedFoodColumnError(error)) {
      dbg(
        "enrichDishesFromFoodTable enhanced columns unavailable, using fallback schema",
        error,
      );
      FOOD_ENHANCED_COLUMNS_AVAILABLE = false;

      const fallback = await db
        .from("food")
        .select(
          "food_id, description, portions_available, is_vegan, allergens_disclosure, is_sold, expires_at, is_archived",
        )
        .in("food_id", ids);

      data = fallback.data;
      error = fallback.error;
    } else if (!error) {
      FOOD_ENHANCED_COLUMNS_AVAILABLE = true;
    }
  }

  if (error) {
    warn("enrichDishesFromFoodTable fallback failed", error);
    return dishes;
  }

  const map = new Map((data || []).map((r) => [Number(r.food_id), r]));
  return (dishes || []).map((d) => {
    const extra = map.get(Number(d?.food_id));
    return extra ? { ...d, ...extra } : d;
  });
}
function getExcludedAllergensList() {
  const base = (DISH_FILTERS.exclude || []).map((x) => String(x).toLowerCase());
  const custom = parseTokens(DISH_FILTERS.custom || "");
  return Array.from(new Set([...base, ...custom])).filter(Boolean);
}
function dishHasExcludedAllergen(dish, excluded) {
  if (!excluded.length) return false;
  const dishTokens = parseTokens(dishAllergensText(dish));
  if (!dishTokens.length) return false;
  return excluded.some((ex) =>
    dishTokens.some((t) => t.includes(ex) || ex.includes(t)),
  );
}
function currentUserId() {
  const id = Number(DBPROFILE?.user_id);
  return Number.isFinite(id) ? id : null;
}
function dishChefId(dish) {
  const n = Number(dish?.chef_id ?? dish?.user_id);
  return Number.isFinite(n) ? n : null;
}
function isOwnDish(dish) {
  const me = currentUserId();
  const chefId = dishChefId(dish);
  return me != null && chefId != null && chefId === me;
}
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function dishDistanceMiles(dish) {
  if (!Number.isFinite(USER_LOC?.lat) || !Number.isFinite(USER_LOC?.lon))
    return null;
  const lat = Number(dish?.chef_lat);
  const lon = Number(dish?.chef_lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return kmToMiles(haversineKm(USER_LOC.lat, USER_LOC.lon, lat, lon));
}
function dishDeliveryRate(dish) {
  const n = Number(dish?.delivery_rate_per_mile ?? dish?.delivery_rate ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function dishEstimatedDeliveryCost(dish) {
  const miles = dishDistanceMiles(dish);
  const rate = dishDeliveryRate(dish);
  if (miles == null || !rate || !toBool(dish?.delivery_available)) return null;
  return miles * rate;
}
function syncFiltersUI() {
  if (fltAllergensWrap && !fltAllergensWrap.dataset.built) {
    fltAllergensWrap.dataset.built = "1";
    fltAllergensWrap.innerHTML = ALLERGENS.map((a) => {
      const id = `fltAlg_${a.key}`;
      return `<div class="col-6"><div class="form-check"><input class="form-check-input" type="checkbox" id="${id}" data-allergen-key="${a.key}"><label class="form-check-label" for="${id}">${a.label}</label></div></div>`;
    }).join("");
  }
  const excluded = getExcludedAllergensList();
  const hasFilters =
    !!DISH_FILTERS.veganOnly ||
    excluded.length > 0 ||
    DISH_FILTERS.maxPrice != null ||
    DISH_FILTERS.nearbyOnly ||
    DISH_FILTERS.pickupOnly ||
    DISH_FILTERS.expiringSoon ||
    (DISH_FILTERS.sort && DISH_FILTERS.sort !== "newest");
  if (btnOpenFilters) {
    btnOpenFilters.classList.toggle("btn-outline-secondary", !hasFilters);
    btnOpenFilters.classList.toggle("btn-brand", hasFilters);
    btnOpenFilters.classList.toggle("text-white", hasFilters);
  }
  const bits = [];
  if (DISH_FILTERS.veganOnly) bits.push("Vegan only");
  if (excluded.length) bits.push(`Excluding: ${excluded.join(", ")}`);
  if (DISH_FILTERS.maxPrice != null)
    bits.push(`Under £${Number(DISH_FILTERS.maxPrice).toFixed(2)}`);
  if (DISH_FILTERS.nearbyOnly) bits.push("Nearby");
  if (DISH_FILTERS.pickupOnly) bits.push("Pickup only");
  if (DISH_FILTERS.expiringSoon) bits.push("Expiring soon");
  if ((DISH_FILTERS.sort || "newest") !== "newest")
    bits.push(`Sorted by ${DISH_FILTERS.sort}`);
  if (filtersSummary) {
    if (!bits.length) {
      filtersSummary.classList.add("d-none");
      filtersSummary.textContent = "";
    } else {
      filtersSummary.textContent = bits.join(" · ");
      filtersSummary.classList.remove("d-none");
      filtersSummary.setAttribute(
        "aria-label",
        `Applied filters: ${bits.join(", ")}`,
      );
    }
  }
  if (fltVeganOnly) fltVeganOnly.checked = !!DISH_FILTERS.veganOnly;
  if (fltCustomAllergens) fltCustomAllergens.value = DISH_FILTERS.custom || "";
  if (dishSort) dishSort.value = DISH_FILTERS.sort || "newest";
  const set = new Set(
    (DISH_FILTERS.exclude || []).map((x) => String(x).toLowerCase()),
  );
  document.querySelectorAll("[data-allergen-key]").forEach((cb) => {
    const key = String(
      cb.getAttribute("data-allergen-key") || "",
    ).toLowerCase();
    cb.checked = set.has(key);
  });
  quickFilterButtons.forEach((btn) => {
    const key = btn.dataset.quickFilter;
    const active =
      (key === "under5" && DISH_FILTERS.maxPrice === 5) ||
      (key === "nearby" && DISH_FILTERS.nearbyOnly) ||
      (key === "pickup" && DISH_FILTERS.pickupOnly) ||
      (key === "today" && DISH_FILTERS.expiringSoon);
    btn.classList.toggle("active-filter", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
// ---------- Location / map ----------
const USER_LOC_KEY = "gfg_user_loc";
function loadUserLoc() {
  try {
    const s = JSON.parse(localStorage.getItem(USER_LOC_KEY) || "null");
    if (s && typeof s.lat === "number" && typeof s.lon === "number")
      return { lat: s.lat, lon: s.lon, is_demo: false };
  } catch {}
  return { lat: 54.597, lon: -5.93, is_demo: true };
}
function saveUserLoc(lat, lon) {
  localStorage.setItem(
    USER_LOC_KEY,
    JSON.stringify({ lat, lon, ts: Date.now() }),
  );
}
let USER_LOC = loadUserLoc();
function setUserLoc(lat, lon, { persist = true } = {}) {
  USER_LOC = { lat, lon, is_demo: false };
  if (persist) saveUserLoc(lat, lon);
  updateMapUserMarker();
}
async function saveUserLocToDb(lat, lon) {
  try {
    const { data, error } = await db.rpc("set_my_location", {
      p_lat: Number(lat),
      p_lon: Number(lon),
    });
    if (error) throw error;
    if (DBPROFILE) {
      DBPROFILE.lat = Number(lat);
      DBPROFILE.lon = Number(lon);
    }
    return { ok: true, data };
  } catch (e) {
    warn("saveUserLocToDb failed", e);
    return { ok: false, error: e };
  }
}
const btnViewList = document.getElementById("btnViewList");
const btnViewMap = document.getElementById("btnViewMap");
const listWrap = document.getElementById("listWrap");
const mapWrap = document.getElementById("mapWrap");
const mapEl = document.getElementById("map");
const btnUseLocation = document.getElementById("btnUseLocation");
const locStatus = document.getElementById("locStatus");
let LOC_VIEW = localStorage.getItem("gfg_locations_view") || "list";
let MAP = null;
let MAP_LAYER = null;
let MAP_USER = null;
let PIN_ICON_OWN = null;
let PIN_ICON_OTHER = null;
function syncLocStatus() {
  if (!locStatus) return;
  locStatus.textContent = USER_LOC?.is_demo
    ? "Using default location (Belfast). Tap “Use current location” to update."
    : "Using your saved location. Tap “Use current location” to refresh.";
  locStatus.setAttribute("role", "status");
  locStatus.setAttribute("aria-live", "polite");
}
syncLocStatus();
function updateMapUserMarker() {
  if (!MAP || !window.L) return;
  if (!Number.isFinite(USER_LOC?.lat) || !Number.isFinite(USER_LOC?.lon))
    return;
  const label = USER_LOC.is_demo ? "You are here (default)" : "You are here";
  const latlng = [USER_LOC.lat, USER_LOC.lon];
  if (!MAP_USER) {
    MAP_USER = L.circleMarker(latlng, {
      radius: 7,
      weight: 2,
      fillOpacity: 0.7,
    })
      .addTo(MAP)
      .bindPopup(label);
  } else {
    MAP_USER.setLatLng(latlng);
    const popup = MAP_USER.getPopup?.();
    if (popup) popup.setContent(label);
    else MAP_USER.bindPopup(label);
  }
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
const kmToMiles = (km) => km * 0.621371;
function getPinIcon(isOwn) {
  if (!window.L) return null;
  if (!PIN_ICON_OTHER || !PIN_ICON_OWN) {
    PIN_ICON_OTHER = L.divIcon({
      className: "gfg-div-icon",
      html: '<div class="gfg-pin other"><i class="bi bi-geo-alt-fill"></i></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });
    PIN_ICON_OWN = L.divIcon({
      className: "gfg-div-icon",
      html: '<div class="gfg-pin own"><i class="bi bi-geo-alt-fill"></i></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });
  }
  return isOwn ? PIN_ICON_OWN : PIN_ICON_OTHER;
}
function ensureMap() {
  if (!mapEl || MAP) return;
  if (!window.L) {
    warn("Leaflet is not loaded");
    return;
  }
  MAP = L.map(mapEl, { zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(MAP);
  MAP_LAYER = L.layerGroup().addTo(MAP);
  if (!MAP.__gfgPopupHook) {
    MAP.__gfgPopupHook = true;
    MAP.on("popupopen", (ev) => {
      const root = ev?.popup?.getElement?.();
      if (!root) return;
      root.querySelectorAll("[data-fav-food]").forEach((btn) => {
        const fid = btn.getAttribute("data-fav-food");
        btn.classList.toggle("is-fav", isFavFood(fid));
      });
    });
  }
  updateMapUserMarker();
  MAP.setView([USER_LOC.lat, USER_LOC.lon], 13);
}
function setLocationsView(view) {
  LOC_VIEW = view === "map" ? "map" : "list";
  localStorage.setItem("gfg_locations_view", LOC_VIEW);
  if (btnViewList) {
    btnViewList.classList.toggle("active", LOC_VIEW === "list");
    btnViewList.setAttribute(
      "aria-pressed",
      LOC_VIEW === "list" ? "true" : "false",
    );
  }
  if (btnViewMap) {
    btnViewMap.classList.toggle("active", LOC_VIEW === "map");
    btnViewMap.setAttribute(
      "aria-pressed",
      LOC_VIEW === "map" ? "true" : "false",
    );
  }
  if (listWrap) {
    listWrap.classList.toggle("d-none", LOC_VIEW !== "list");
    listWrap.setAttribute(
      "aria-hidden",
      LOC_VIEW === "list" ? "false" : "true",
    );
  }
  if (mapWrap) {
    mapWrap.classList.toggle("d-none", LOC_VIEW !== "map");
    mapWrap.setAttribute("aria-hidden", LOC_VIEW === "map" ? "false" : "true");
  }
  if (mapA11yNote)
    mapA11yNote.classList.toggle("d-none", !access.sr || LOC_VIEW !== "map");
  if (mapEl) mapEl.setAttribute("aria-hidden", access.sr ? "true" : "false");
  if (LOC_VIEW === "map") {
    announce(
      access.sr
        ? "Map view opened. The list view remains the accessible option for screen readers."
        : "Map view opened.",
      "polite",
    );
    ensureMap();
    setTimeout(() => {
      try {
        MAP?.invalidateSize(true);
        renderMap();
      } catch (e) {
        warn("map invalidate/render failed", e);
      }
    }, 50);
  } else {
    announce("List view opened.", "polite");
  }
}
btnViewList?.addEventListener("click", () => setLocationsView("list"));
btnViewMap?.addEventListener("click", () => setLocationsView("map"));
btnMapUseList?.addEventListener("click", () => {
  setLocationsView("list");
  btnViewList?.focus();
});
async function requestCurrentLocation() {
  if (!window.isSecureContext) {
    const m =
      "Location requires HTTPS (or localhost). If you opened this as a file or over http, it will fail.";
    if (locStatus) locStatus.textContent = m;
    announce(m, "assertive");
    alert(m);
    return;
  }
  if (!navigator.geolocation) {
    const m = "Geolocation not supported by your browser.";
    if (locStatus) locStatus.textContent = m;
    announce(m, "assertive");
    alert(m);
    return;
  }
  if (locStatus) locStatus.textContent = "Getting your location…";
  announce("Getting your location.", "polite");
  if (btnUseLocation) btnUseLocation.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos?.coords?.latitude;
      const lon = pos?.coords?.longitude;
      const accuracy = pos?.coords?.accuracy;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        const m = "Could not read coordinates from the device.";
        if (locStatus) locStatus.textContent = m;
        announce(m, "assertive");
        alert(m);
        if (btnUseLocation) btnUseLocation.disabled = false;
        return;
      }
      setUserLoc(lat, lon, { persist: true });
      if (MAP) {
        MAP.setView([USER_LOC.lat, USER_LOC.lon], 14);
        setTimeout(() => {
          try {
            MAP.invalidateSize(true);
          } catch {}
        }, 0);
      }
      if (LOC_VIEW === "map") renderMap();
      if (locStatus) locStatus.textContent = "Saving location to your account…";
      if (!DBPROFILE?.user_id) {
        const m =
          "Location saved on this device. Finish profile setup to save it to your account.";
        if (locStatus) locStatus.textContent = m;
        announce(m, "polite");
        onboardModal?.show();
        if (btnUseLocation) btnUseLocation.disabled = false;
        return;
      }
      const res = await saveUserLocToDb(lat, lon);
      if (!res.ok) {
        const m =
          "Location saved on this device, but could not save to your account. Try again.";
        if (locStatus) locStatus.textContent = m;
        announce(m, "assertive");
        if (btnUseLocation) btnUseLocation.disabled = false;
        return;
      }
      if (locStatus) {
        locStatus.textContent = accuracy
          ? `Location saved (±${Math.round(accuracy)}m) and stored on your account.`
          : "Location saved and stored on your account.";
        announce(locStatus.textContent, "polite");
      }
      if (btnUseLocation) btnUseLocation.disabled = false;
    },
    (e) => {
      let msg = "Could not get your location.";
      if (e?.code === 1)
        msg =
          "Location permission denied. Enable it in your browser settings and try again.";
      else if (e?.code === 2) msg = "Location unavailable (no signal/GPS).";
      else if (e?.code === 3) msg = "Timed out getting location. Try again.";
      if (locStatus) locStatus.textContent = msg;
      announce(msg, "assertive");
      alert(msg);
      if (btnUseLocation) btnUseLocation.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  );
}
btnUseLocation?.addEventListener("click", requestCurrentLocation);

// ---------- Reviews / order / reporting ----------
const reviewsModalEl = document.getElementById("reviewsModal");
const reviewsModal = reviewsModalEl
  ? bootstrap.Modal.getOrCreateInstance(reviewsModalEl)
  : null;
const reviewsTitle = document.getElementById("reviewsTitle");
const reviewsList = document.getElementById("reviewsList");
const reviewsAvg = document.getElementById("reviewsAvg");
const reviewsCount = document.getElementById("reviewsCount");
const reviewComposerWrap = document.getElementById("reviewComposerWrap");
const reviewReadOnlyHint = document.getElementById("reviewReadOnlyHint");
const reviewForm = document.getElementById("reviewForm");
const reviewRating = document.getElementById("reviewRating");
const reviewText = document.getElementById("reviewText");
const reviewMsg = document.getElementById("reviewMsg");
let REVIEW_CTX = null;

const orderModalEl = document.getElementById("orderModal");
const orderModal = orderModalEl
  ? bootstrap.Modal.getOrCreateInstance(orderModalEl)
  : null;
const orderForm = document.getElementById("orderForm");
const orderDishSummary = document.getElementById("orderDishSummary");
const orderPickupRadio = document.getElementById("orderPickup");
const orderDeliveryRadio = document.getElementById("orderDelivery");
const orderDeliveryCostLabel = document.getElementById(
  "orderDeliveryCostLabel",
);
const orderTotalPrice = document.getElementById("orderTotalPrice");
const orderMsg = document.getElementById("orderMsg");
const orderQty = document.getElementById("orderQty");
const orderQtyMax = document.getElementById("orderQtyMax");
let ORDER_CTX = null;

const reportModalEl = document.getElementById("reportModal");
const reportModal = reportModalEl
  ? bootstrap.Modal.getOrCreateInstance(reportModalEl)
  : null;
const reportForm = document.getElementById("reportForm");
const reportReason = document.getElementById("reportReason");
const reportMsg = document.getElementById("reportMsg");
let REPORT_CTX = null;

const modReportsModalEl = document.getElementById("modReportsModal");
const modReportsModal = modReportsModalEl
  ? bootstrap.Modal.getOrCreateInstance(modReportsModalEl)
  : null;
const modReportsList = document.getElementById("modReportsList");
const modReportsMsg = document.getElementById("modReportsMsg");
let MOD_PENDING_REPORTS = [];

function getChefFoodIdsFromCache(chefId) {
  const cid = Number(chefId);
  if (!Number.isFinite(cid)) return [];
  const ids = new Set();
  for (const d of DISHES || []) {
    const c = dishChefId(d);
    const fid = Number(d?.food_id);
    if (c === cid && Number.isFinite(fid)) ids.add(fid);
  }
  return Array.from(ids);
}
async function loadReviewsForChef(chefId) {
  const cid = Number(chefId);
  if (!Number.isFinite(cid)) {
    if (reviewsList)
      reviewsList.innerHTML =
        '<div class="text-danger small">Missing chef id.</div>';
    if (reviewsCount) reviewsCount.textContent = "0";
    if (reviewsAvg) reviewsAvg.textContent = "–";
    return;
  }
  let { data, error } = await db
    .from("reviews_v")
    .select("*")
    .eq("chef_id", cid)
    .order("created_at", { ascending: false });
  if (error) {
    const foodIds = getChefFoodIdsFromCache(cid);
    if (!foodIds.length) {
      if (reviewsList)
        reviewsList.innerHTML = '<div class="text-muted">No reviews yet.</div>';
      if (reviewsCount) reviewsCount.textContent = "0";
      if (reviewsAvg) reviewsAvg.textContent = "–";
      return;
    }
    const res2 = await db
      .from("reviews_v")
      .select("*")
      .in("food_id", foodIds)
      .order("created_at", { ascending: false });
    data = res2.data;
    error = res2.error;
  }
  if (error) {
    if (reviewsList)
      reviewsList.innerHTML = `<div class="text-danger small">${error.message || "Failed to load reviews."}</div>`;
    if (reviewsCount) reviewsCount.textContent = "0";
    if (reviewsAvg) reviewsAvg.textContent = "–";
    return;
  }
  if (!data?.length) {
    if (reviewsList)
      reviewsList.innerHTML = '<div class="text-muted">No reviews yet.</div>';
    if (reviewsCount) reviewsCount.textContent = "0";
    if (reviewsAvg) reviewsAvg.textContent = "–";
    return;
  }
  const frag = document.createDocumentFragment();
  let sum = 0;
  data.forEach((r) => {
    const rating = Number(r.rating) || 0;
    sum += rating;
    const dishTitle =
      r.food_title ??
      r.dish_title ??
      r.title ??
      (r.food_id != null ? `Dish #${r.food_id}` : "Dish");
    const reviewer = r.reviewer_name ?? r.user_name ?? r.reviewer ?? "User";
    const created = r.created_at ?? r.inserted_at ?? r.created ?? null;
    const createdLabel = created ? new Date(created).toLocaleString() : "";
    const el = document.createElement("article");
    el.className = "p-2 border rounded";
    el.setAttribute("role", "listitem");
    el.innerHTML = `<div class="d-flex justify-content-between"><div class="fw-semibold">${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}</div><div class="text-muted small">${escHtml(createdLabel)}</div></div><div class="small">${escHtml(reviewer)}</div><div class="text-muted small">Dish: ${escHtml(dishTitle)}</div><div class="mt-1">${escHtml(r.comment || "")}</div>`;
    frag.appendChild(el);
  });
  if (reviewsList) {
    reviewsList.innerHTML = "";
    reviewsList.appendChild(frag);
  }
  if (reviewsCount) reviewsCount.textContent = String(data.length);
  if (reviewsAvg) reviewsAvg.textContent = (sum / data.length).toFixed(1);
}
async function prefillReviewForOrder(orderId) {
  const oid = Number(orderId);
  if (!Number.isFinite(oid)) return;
  if (reviewRating) reviewRating.value = "";
  if (reviewText) reviewText.value = "";
  const { data, error } = await db
    .from("reviews_v")
    .select("rating, comment")
    .eq("order_id", oid)
    .maybeSingle();
  if (error && error.code !== "PGRST116") return;
  if (data) {
    if (reviewRating) reviewRating.value = String(data.rating ?? "");
    if (reviewText) reviewText.value = data.comment ?? "";
    if (reviewMsg) {
      reviewMsg.className = "small text-muted";
      reviewMsg.textContent = "You can update your review for this order.";
    }
  }
}
async function openReviewsForDish(ctx) {
  REVIEW_CTX = ctx;
  const dishTitle = ctx.title || "Dish";
  const chefName = ctx.chef_name || "Chef";
  if (reviewsTitle)
    reviewsTitle.textContent =
      ctx.mode === "write"
        ? `Review “${dishTitle}” - ${chefName}`
        : `Reviews - ${chefName}`;
  if (reviewsList) reviewsList.innerHTML = "";
  if (reviewsAvg) reviewsAvg.textContent = "–";
  if (reviewsCount) reviewsCount.textContent = "0";
  if (reviewMsg) {
    reviewMsg.className = "small";
    reviewMsg.textContent = "";
  }
  const canWrite =
    ctx.mode === "write" && Number.isFinite(Number(ctx.order_id));
  reviewComposerWrap?.classList.toggle("d-none", !canWrite);
  reviewReadOnlyHint?.classList.toggle("d-none", canWrite);
  const selfReview = Number(DBPROFILE?.user_id) === Number(ctx.chef_id);
  if (selfReview) {
    reviewComposerWrap?.classList.add("d-none");
    reviewReadOnlyHint?.classList.remove("d-none");
    if (reviewMsg) {
      reviewMsg.className = "small text-muted";
      reviewMsg.textContent = `Chefs can't review their own dishes.`;
    }
  }
  await loadReviewsForChef(ctx.chef_id);
  if (canWrite && !selfReview) await prefillReviewForOrder(ctx.order_id);
  else reviewForm?.reset?.();
  reviewsModal?.show();
}
reviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormInvalid(reviewForm);
  setMsg(reviewMsg, "muted", "Validating…");
  if (!DBPROFILE?.user_id) {
    setMsg(reviewMsg, "danger", "Finish setting up your profile first.");
    onboardModal?.show();
    return;
  }
  if (
    !REVIEW_CTX ||
    REVIEW_CTX.mode !== "write" ||
    !Number.isFinite(Number(REVIEW_CTX.order_id))
  ) {
    setMsg(
      reviewMsg,
      "danger",
      "You can only write reviews from Order history.",
    );
    return;
  }
  const ratingRaw = String(reviewRating?.value || "").trim();
  const rating = Number(ratingRaw);
  if (!ratingRaw || !Number.isFinite(rating) || rating < 1 || rating > 5)
    setInvalid(reviewRating, "Choose a rating between 1 and 5.");
  const commentR = V.text(reviewText, "Comment", {
    required: false,
    min: 0,
    max: 300,
  });
  if (!commentR.ok) setInvalid(reviewText, commentR.msg);
  if (reviewForm.querySelector(".is-invalid")) {
    setMsg(reviewMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(reviewForm);
    return;
  }
  setMsg(reviewMsg, "muted", "Submitting…");
  const { error } = await db.rpc("add_review_for_order", {
    p_order_id: Number(REVIEW_CTX.order_id),
    p_rating: rating,
    p_comment: (commentR.value || "").trim(),
  });
  if (error) {
    setMsg(reviewMsg, "danger", error.message || "Could not submit review.");
    return;
  }
  setMsg(reviewMsg, "success", "Thanks! Your review was saved.");
  await loadReviewsForChef(REVIEW_CTX.chef_id);
  if (PAGE === "dashboard") await loadOrdersAndDashboard();
});

function clampQty(qty, max) {
  const q = Number(qty);
  if (!Number.isFinite(q)) return 1;
  const qi = Math.floor(q);
  return Math.max(1, Math.min(max, qi));
}
function updateOrderPriceDisplay() {
  if (!ORDER_CTX || !orderTotalPrice) return;
  const dish = ORDER_CTX.dish;
  const maxQty = Math.max(1, dishPortions(dish));
  const qty = clampQty(orderQty?.value ?? 1, maxQty);
  if (orderQty) orderQty.value = String(qty);
  if (orderQtyMax) orderQtyMax.textContent = String(maxQty);
  const basePrice = Number(dish.price || 0) * qty;
  let deliveryCost = 0;
  const method = orderDeliveryRadio?.checked
    ? "delivery"
    : orderPickupRadio?.checked
      ? "pickup"
      : null;
  if (
    method === "delivery" &&
    ORDER_CTX.distanceMiles != null &&
    ORDER_CTX.deliveryRate > 0
  ) {
    deliveryCost = ORDER_CTX.distanceMiles * ORDER_CTX.deliveryRate;
  }
  if (orderDeliveryCostLabel) {
    orderDeliveryCostLabel.textContent =
      method === "delivery" && deliveryCost > 0
        ? ` (~£${deliveryCost.toFixed(2)} extra)`
        : "";
  }
  orderTotalPrice.textContent = GBP(basePrice + deliveryCost);
}
orderPickupRadio?.addEventListener("change", updateOrderPriceDisplay);
orderDeliveryRadio?.addEventListener("change", updateOrderPriceDisplay);
orderQty?.addEventListener("input", updateOrderPriceDisplay);
orderQty?.addEventListener("change", updateOrderPriceDisplay);

let REPORTED_FOOD_IDS = new Set();
let REPORTED_ORDER_IDS = new Set();
let REPORT_CACHE_USER_ID = null;
function reportFoodCacheKey(userId) {
  return `gfg_reported_food_v2_${userId}`;
}
function reportOrderCacheKey(userId) {
  return `gfg_reported_order_v2_${userId}`;
}
function resetReportedFoods() {
  REPORTED_FOOD_IDS = new Set();
  REPORTED_ORDER_IDS = new Set();
  REPORT_CACHE_USER_ID = null;
}
function loadReportedFoods(userId) {
  REPORT_CACHE_USER_ID = Number(userId);
  try {
    const rawFoods = localStorage.getItem(
      reportFoodCacheKey(REPORT_CACHE_USER_ID),
    );
    const foodsArr = rawFoods ? JSON.parse(rawFoods) : [];
    REPORTED_FOOD_IDS = new Set((foodsArr || []).map((x) => String(Number(x))));
  } catch {
    REPORTED_FOOD_IDS = new Set();
  }
  try {
    const rawOrders = localStorage.getItem(
      reportOrderCacheKey(REPORT_CACHE_USER_ID),
    );
    const ordersArr = rawOrders ? JSON.parse(rawOrders) : [];
    REPORTED_ORDER_IDS = new Set(
      (ordersArr || []).map((x) => String(Number(x))),
    );
  } catch {
    REPORTED_ORDER_IDS = new Set();
  }
}
function saveReportedFoods() {
  if (!Number.isFinite(REPORT_CACHE_USER_ID)) return;
  localStorage.setItem(
    reportFoodCacheKey(REPORT_CACHE_USER_ID),
    JSON.stringify(Array.from(REPORTED_FOOD_IDS)),
  );
  localStorage.setItem(
    reportOrderCacheKey(REPORT_CACHE_USER_ID),
    JSON.stringify(Array.from(REPORTED_ORDER_IDS)),
  );
}
function hasReportedFoodLocal(foodId) {
  const fid = Number(foodId);
  return Number.isFinite(fid) && REPORTED_FOOD_IDS.has(String(fid));
}
function hasReportedOrderLocal(orderId) {
  const oid = Number(orderId);
  return Number.isFinite(oid) && REPORTED_ORDER_IDS.has(String(oid));
}
function markFoodReported(foodId) {
  const fid = Number(foodId);
  if (!Number.isFinite(fid)) return;
  REPORTED_FOOD_IDS.add(String(fid));
  saveReportedFoods();
}
function markOrderReported(orderId) {
  const oid = Number(orderId);
  if (!Number.isFinite(oid)) return;
  REPORTED_ORDER_IDS.add(String(oid));
  saveReportedFoods();
}
async function refreshReportCacheFromDb() {
  const me = Number(DBPROFILE?.user_id);
  if (!Number.isFinite(me)) return;
  if (REPORT_CACHE_USER_ID !== me) loadReportedFoods(me);
  const { data, error } = await db
    .from("reports")
    .select("order_id, orders!inner(food_id)")
    .eq("reporter_id", me);
  if (error) {
    warn("refreshReportCacheFromDb failed", error);
    return;
  }
  for (const r of data || []) {
    const oid = Number(r?.order_id);
    if (Number.isFinite(oid)) REPORTED_ORDER_IDS.add(String(oid));
    const embedded = r?.orders;
    const fid = Number(
      (Array.isArray(embedded) ? embedded?.[0]?.food_id : embedded?.food_id) ??
        NaN,
    );
    if (Number.isFinite(fid)) REPORTED_FOOD_IDS.add(String(fid));
  }
  saveReportedFoods();
}
async function hasReportedOrderDb(orderId) {
  const me = Number(DBPROFILE?.user_id);
  const oid = Number(orderId);
  if (!Number.isFinite(me) || !Number.isFinite(oid)) return false;
  const { data, error } = await db
    .from("reports")
    .select("report_id")
    .eq("reporter_id", me)
    .eq("order_id", oid)
    .limit(1);
  if (!error && data && data.length > 0) return true;
  if (error) warn("hasReportedOrderDb failed", error);
  return false;
}
async function hasReportedOrder(orderId) {
  if (hasReportedOrderLocal(orderId)) return true;
  const inDb = await hasReportedOrderDb(orderId).catch(() => false);
  if (inDb) markOrderReported(orderId);
  return inDb;
}
async function hasReportedFoodDb(foodId) {
  const me = Number(DBPROFILE?.user_id);
  const fid = Number(foodId);
  if (!Number.isFinite(me) || !Number.isFinite(fid)) return false;
  const { data, error } = await db
    .from("reports")
    .select("report_id, orders!inner(food_id)")
    .eq("reporter_id", me)
    .eq("orders.food_id", fid)
    .limit(1);
  if (!error && data && data.length > 0) return true;
  if (error) warn("hasReportedFoodDb failed", error);
  return false;
}
async function hasReportedFood(foodId) {
  if (hasReportedFoodLocal(foodId)) return true;
  const inDb = await hasReportedFoodDb(foodId).catch(() => false);
  if (inDb) markFoodReported(foodId);
  return inDb;
}

reportForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormInvalid(reportForm);
  if (!REPORT_CTX) {
    setMsg(reportMsg, "danger", "No order selected.");
    return;
  }
  if (!DBPROFILE?.user_id) {
    setMsg(
      reportMsg,
      "danger",
      "Finish setting up your profile before reporting.",
    );
    onboardModal?.show();
    return;
  }
  const reasonR = V.text(reportReason, "Reason", {
    required: true,
    min: 10,
    max: 800,
  });
  if (!reasonR.ok) setInvalid(reportReason, reasonR.msg);
  if (reportForm.querySelector(".is-invalid")) {
    setMsg(reportMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(reportForm);
    return;
  }
  setMsg(reportMsg, "muted", "Submitting report…");
  try {
    const orderId = Number(REPORT_CTX?.order_id);
    const foodId = Number(REPORT_CTX?.food_id);
    if (Number.isFinite(orderId) && (await hasReportedOrder(orderId))) {
      setMsg(
        reportMsg,
        "danger",
        "You have already reported this order (one report per order).",
      );
      return;
    }
    if (Number.isFinite(foodId) && (await hasReportedFood(foodId))) {
      setMsg(
        reportMsg,
        "danger",
        "You have already reported this listing (one report per listing).",
      );
      return;
    }
    const { error } = await db.from("reports").insert({
      order_id: REPORT_CTX.order_id,
      reported_chef_id: REPORT_CTX.chef_id,
      reporter_id: DBPROFILE.user_id,
      reason: reasonR.value,
      strike_value: 1,
    });
    if (error) throw error;
    setMsg(reportMsg, "success", "Thanks. Your report has been submitted.");
    pushNotification(
      "Report submitted",
      `Order #${REPORT_CTX.order_id} is now awaiting review.`,
      "warning",
      { order_id: REPORT_CTX.order_id },
    );
    if (Number.isFinite(orderId)) markOrderReported(orderId);
    if (Number.isFinite(foodId)) markFoodReported(foodId);
    if (PAGE === "dashboard") await loadOrdersAndDashboard();
    setTimeout(() => reportModal?.hide(), 800);
  } catch (e2) {
    console.error("submit report error", e2);
    setMsg(reportMsg, "danger", e2.message || "Could not submit report.");
  }
});

function badgeHtmlForDecision(decision) {
  const d = decision || "Pending Decision";
  if (d === "Yes") return '<span class="badge text-bg-success">Accepted</span>';
  if (d === "No") return '<span class="badge text-bg-danger">Rejected</span>';
  return '<span class="badge text-bg-warning">Pending Decision</span>';
}
function syncModeratorPendingCount() {
  const el = document.getElementById("modPendingCount");
  if (el) el.textContent = String(MOD_PENDING_REPORTS.length);
}
function renderPendingReportsList() {
  if (!modReportsList) return;
  if (!MOD_PENDING_REPORTS.length) {
    modReportsList.innerHTML =
      '<div class="text-muted small">No pending reports right now.</div>';
    return;
  }
  modReportsList.innerHTML = MOD_PENDING_REPORTS.map((r) => {
    const created = r.created_at ? new Date(r.created_at).toLocaleString() : "";
    const reasonHtml = String(r.reason || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    return `<div class="border rounded p-2 small"><div class="d-flex justify-content-between align-items-start gap-2"><div><div class="fw-semibold">Report #${r.report_id} ${badgeHtmlForDecision("Pending Decision")}</div><div class="text-muted">Order #${r.order_id} · Strikes: ${Number(r.strike_value || 0)} · ${created}</div><div class="mt-1"><div><span class="text-muted">Reporter:</span> ${escHtml(r.reporter_name || "Unknown")}</div><div><span class="text-muted">Reported chef:</span> ${escHtml(r.reported_chef_name || "Unknown")}</div></div></div><div class="d-flex flex-column gap-1"><button type="button" class="btn btn-sm btn-success" data-mod-decide="Yes" data-report-id="${r.report_id}">Accept</button><button type="button" class="btn btn-sm btn-danger" data-mod-decide="No" data-report-id="${r.report_id}">Reject</button></div></div><div class="mt-2">${reasonHtml}</div></div>`;
  }).join("");
}
async function fetchPendingReports() {
  if (modReportsMsg) {
    modReportsMsg.className = "small text-muted mb-2";
    modReportsMsg.textContent = "Loading pending reports…";
  }
  const { data, error } = await db.rpc("get_pending_reports");
  if (error) {
    console.error("get_pending_reports error", error);
    MOD_PENDING_REPORTS = [];
    if (modReportsMsg) {
      modReportsMsg.className = "small text-danger mb-2";
      modReportsMsg.textContent =
        error.message || "Could not load pending reports.";
    }
    renderPendingReportsList();
    syncModeratorPendingCount();
    return;
  }
  MOD_PENDING_REPORTS = Array.isArray(data) ? data : [];
  if (modReportsMsg) {
    modReportsMsg.className = "small text-muted mb-2";
    modReportsMsg.textContent =
      MOD_PENDING_REPORTS.length === 0
        ? "No pending reports."
        : "Choose Accept or Reject for each report.";
  }
  renderPendingReportsList();
  syncModeratorPendingCount();
}
modReportsList?.addEventListener("click", async (e) => {
  const realBtn =
    e.target instanceof Element ? e.target.closest("[data-mod-decide]") : null;
  if (!realBtn) return;
  const decision = realBtn.getAttribute("data-mod-decide");
  const reportId = Number(realBtn.getAttribute("data-report-id"));
  if (!decision || !Number.isFinite(reportId)) return;
  const card = realBtn.closest(".border");
  card?.querySelectorAll("button")?.forEach((b) => (b.disabled = true));
  if (modReportsMsg) {
    modReportsMsg.className = "small text-muted mb-2";
    modReportsMsg.textContent = `Saving decision (${decision})…`;
  }
  const { error } = await db.rpc("review_report", {
    p_report_id: reportId,
    p_decision: decision,
  });
  if (error) {
    console.error("review_report error", error);
    if (modReportsMsg) {
      modReportsMsg.className = "small text-danger mb-2";
      modReportsMsg.textContent = error.message || "Could not save decision.";
    }
    card?.querySelectorAll("button")?.forEach((b) => (b.disabled = false));
    return;
  }
  if (modReportsMsg) {
    modReportsMsg.className = "small text-success mb-2";
    modReportsMsg.textContent = `Saved: ${decision}. Refreshing list…`;
  }
  await fetchPendingReports();
});

// ---------- Dishes ----------

const CHEF_PROFILE_CACHE = new Map();
async function loadChefProfileSummary(chefId) {
  const cid = Number(chefId);
  if (!Number.isFinite(cid)) return null;
  if (CHEF_PROFILE_CACHE.has(cid)) return CHEF_PROFILE_CACHE.get(cid);

  let profile = null;

  try {
    // Try enhanced users_v first
    let uRes = await db
      .from("users_v")
      .select(
        "user_id, user_name, user_group, email, auth_uid, created_at, lat, lon, avatar_url, bio, pickup_area, hygiene_note",
      )
      .eq("user_id", cid)
      .maybeSingle();

    // Fallback to old users_v shape if enhanced columns do not exist yet
    if (uRes.error) {
      warn(
        "loadChefProfileSummary users_v enhanced select failed, trying fallback",
        uRes.error,
      );

      uRes = await db
        .from("users_v")
        .select(
          "user_id, user_name, user_group, email, auth_uid, created_at, lat, lon",
        )
        .eq("user_id", cid)
        .maybeSingle();
    }

    const [{ data: revData }, { data: favData }, { data: ordData }] =
      await Promise.all([
        db.from("reviews_v").select("rating").eq("chef_id", cid),
        db.from("favourite_counts_v").select("fav_count").eq("chef_id", cid),
        db.from("chef_orders_v").select("order_id").eq("chef_id", cid),
      ]);

    const ratings = (revData || [])
      .map((r) => Number(r.rating || 0))
      .filter(Boolean);

    profile = {
      ...(uRes.data || {}),
      avg_rating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null,
      review_count: ratings.length,
      favourite_count: (favData || []).reduce(
        (sum, r) => sum + Number(r.fav_count || 0),
        0,
      ),
      completed_orders: (ordData || []).length,
    };
  } catch (e) {
    warn("loadChefProfileSummary failed", e);
    profile = null;
  }

  CHEF_PROFILE_CACHE.set(cid, profile);
  return profile;
}
function listingSortLabel(value) {
  return (
    {
      newest: "newest",
      nearest: "nearest distance",
      cheapest: "lowest price",
      highestRated: "highest rating",
      expiringSoon: "expiry time",
    }[value] || value
  );
}
function getFilteredDishes() {
  const q = (dishSearch?.value || "").toLowerCase();
  const excluded = getExcludedAllergensList();
  let list = DISHES.filter((d) =>
    [d.title, d.chef_name, d.category, d.description, d.pickup_area].some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(q),
    ),
  )
    .filter((d) => !dishIsArchived(d))
    .filter((d) => !dishIsExpired(d))
    .filter((d) => dishPortions(d) > 0)
    .filter((d) => (!DISH_FILTERS.veganOnly ? true : dishIsVegan(d)))
    .filter((d) => !dishHasExcludedAllergen(d, excluded));
  if (DISH_FILTERS.maxPrice != null)
    list = list.filter(
      (d) => Number(d.price || 0) <= Number(DISH_FILTERS.maxPrice),
    );
  if (DISH_FILTERS.pickupOnly)
    list = list.filter((d) => toBool(d.pickup_available ?? true));
  if (DISH_FILTERS.nearbyOnly)
    list = list.filter((d) => {
      const miles = dishDistanceMiles(d);
      return miles != null && miles <= 3;
    });
  if (DISH_FILTERS.expiringSoon)
    list = list.filter((d) => {
      const exp = dishExpiresAt(d);
      if (!exp) return false;
      const ms = new Date(exp).getTime() - Date.now();
      return Number.isFinite(ms) && ms > 0 && ms <= 24 * 60 * 60 * 1000;
    });
  const sort = DISH_FILTERS.sort || "newest";
  list = list.sort((a, b) => {
    if (sort === "nearest") {
      return (
        (dishDistanceMiles(a) ?? Number.MAX_SAFE_INTEGER) -
        (dishDistanceMiles(b) ?? Number.MAX_SAFE_INTEGER)
      );
    }
    if (sort === "cheapest") {
      return Number(a.price || 0) - Number(b.price || 0);
    }
    if (sort === "highestRated") {
      return (
        Number(b.avg_rating || b.rating || 0) -
        Number(a.avg_rating || a.rating || 0)
      );
    }
    if (sort === "expiringSoon") {
      return (
        new Date(dishExpiresAt(a) || "9999-12-31").getTime() -
        new Date(dishExpiresAt(b) || "9999-12-31").getTime()
      );
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return list;
}
async function openDishDetails(foodId) {
  let dish = DISHES.find((d) => Number(d.food_id) === Number(foodId));
  if (!dish || !detailsBody) return;

  // If the listings source did not include description or enhanced fields,
  // try to hydrate this one dish from the food table before rendering.
  const needsHydration =
    !dish.description ||
    dish.description === "No description provided." ||
    dish.ingredients == null ||
    dish.prep_date == null ||
    dish.status_note == null;

  if (needsHydration) {
    let fullRow = null;

    // Try enhanced schema first
    let res = await db
      .from("food")
      .select(
        "food_id, description, ingredients, prep_date, status_note, portions_available, is_vegan, allergens_disclosure, is_sold, expires_at, is_archived, pickup_available, delivery_available, delivery_rate_per_mile, image_url",
      )
      .eq("food_id", Number(foodId))
      .maybeSingle();

    // Fall back if enhanced columns are unavailable
    if (res.error && isMissingEnhancedFoodColumnError(res.error)) {
      res = await db
        .from("food")
        .select(
          "food_id, description, portions_available, is_vegan, allergens_disclosure, is_sold, expires_at, is_archived, pickup_available, delivery_available, delivery_rate_per_mile, image_url",
        )
        .eq("food_id", Number(foodId))
        .maybeSingle();
    }

    if (!res.error && res.data) {
      fullRow = res.data;
      dish = { ...dish, ...fullRow };

      // Keep DISHES cache in sync so the next details open is instant
      DISHES = DISHES.map((d) =>
        Number(d.food_id) === Number(foodId) ? { ...d, ...fullRow } : d,
      );
    }
  }

  const chef = await loadChefProfileSummary(dishChefId(dish));
  const miles = dishDistanceMiles(dish);
  const deliveryCost = dishEstimatedDeliveryCost(dish);
  const exp = dishExpiresAt(dish);

  detailsBody.innerHTML = `
    <div class="d-flex gap-3 mb-3 align-items-start">
      <img src="${dish.image_url || "https://placehold.co/160x120?text=Food"}" alt="${escHtml(dish.title)}" style="width:120px;height:90px;object-fit:cover;border-radius:12px" />
      <div>
        <h6 class="mb-1">${escHtml(dish.title)}</h6>
        <div class="text-muted small">${escHtml(dish.category || "")} · ${GBP(dish.price)}</div>
        <div class="small mt-1">${orderStatusBadge("placed")} ${dishIsVegan(dish) ? '<span class="chip ms-2"><i class="bi bi-leaf-fill"></i> Vegan</span>' : ""}</div>
      </div>
    </div>
    <p>${escHtml(dish.description || "No description provided.")}</p>
    <div class="detail-list">
      <div class="detail-row"><strong>Ingredients</strong><span>${escHtml(dish.ingredients || "Not provided")}</span></div>
      <div class="detail-row"><strong>Allergens</strong><span>${escHtml(dishAllergensText(dish) || "Not provided")}</span></div>
      <div class="detail-row"><strong>Portions remaining</strong><span>${dishPortions(dish)}</span></div>
      <div class="detail-row"><strong>Pickup</strong><span>${toBool(dish.pickup_available ?? true) ? "Available" : "Not available"}</span></div>
      <div class="detail-row"><strong>Delivery</strong><span>${toBool(dish.delivery_available) ? `Available${deliveryCost != null ? ` (est. ${GBP(deliveryCost)})` : ""}` : "Not available"}</span></div>
      <div class="detail-row"><strong>Distance</strong><span>${miles != null ? `${miles.toFixed(1)} miles away` : "Distance unavailable"}</span></div>
      <div class="detail-row"><strong>Expires</strong><span>${exp ? `${new Date(exp).toLocaleString()} (${timeLeftLabel(exp)} left)` : "Not set"}</span></div>
      <div class="detail-row"><strong>Prepared on</strong><span>${dish.prep_date ? new Date(dish.prep_date).toLocaleDateString() : "Not provided"}</span></div>
    </div>
    <hr />
    <div class="d-flex gap-3 align-items-start">
      <div class="avatar" style="flex:0 0 56px; overflow:hidden;">
        ${
          chef?.avatar_url
            ? `<img src="${escHtml(chef.avatar_url)}" alt="${escHtml(chef.user_name || dish.chef_name || "Chef")}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : escHtml(
                (chef?.user_name || dish.chef_name || "C")
                  .charAt(0)
                  .toUpperCase(),
              )
        }
      </div>
      <div class="flex-grow-1">
        <div class="fw-semibold">${escHtml(chef?.user_name || dish.chef_name || "Chef")}</div>
        <div class="small text-muted">${chef?.pickup_area ? escHtml(chef.pickup_area) : "Collection area not set"}</div>
        <div class="small mt-1">${chef?.bio ? escHtml(chef.bio) : "No chef bio added yet."}</div>
        <div class="small mt-2">${chef?.hygiene_note ? `<strong>Food safety note:</strong> ${escHtml(chef.hygiene_note)}` : ""}</div>
        <div class="small mt-2 text-muted">${chef?.avg_rating ? `${chef.avg_rating.toFixed(1)}/5 average` : "No ratings yet"} · ${chef?.review_count || 0} reviews · ${chef?.completed_orders || 0} completed orders · ${chef?.favourite_count || 0} favourites</div>
      </div>
    </div>
  `;

  detailsModal?.show();
}
function renderMap() {
  if (!MAP || !MAP_LAYER) return;
  MAP_LAYER.clearLayers();
  const list = getFilteredDishes();
  const byChef = new Map();
  for (const d of list) {
    const lat = d.chef_lat;
    const lon = d.chef_lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const chefId = d.user_id ?? d.chef_id ?? "chef";
    const key = String(chefId);
    if (!byChef.has(key)) {
      const isOwn = (() => {
        const me = currentUserId();
        const cid = Number(chefId);
        return me != null && Number.isFinite(cid) && cid === me;
      })();
      byChef.set(key, {
        chef_id: chefId,
        chef_name: d.chef_name ?? "Chef",
        lat,
        lon,
        dishes: [],
        is_own: isOwn,
      });
    }
    byChef.get(key).dishes.push(d);
  }
  const groups = Array.from(byChef.values());
  if (!groups.length) {
    MAP.setView([USER_LOC.lat, USER_LOC.lon], 13);
    return;
  }
  const bounds = [];
  for (const g of groups) {
    bounds.push([g.lat, g.lon]);
    const dishesHtml = g.dishes
      .slice(0, 8)
      .map((dish) => {
        const foodId = dish.food_id;
        const ownDish = isOwnDish(dish);
        const favCls = isFavFood(foodId) ? "is-fav" : "";
        const miles = dishDistanceMiles(dish);
        return `<div class="border-top pt-2 mt-2"><div class="fw-semibold">${escHtml(dish.title)}</div><div class="text-muted small">${escHtml(dish.category ?? "")} · ${GBP(dish.price)}${miles != null ? ` · ${miles.toFixed(1)}mi` : ""}</div><div class="d-flex gap-2 mt-2 flex-wrap"><button type="button" class="btn btn-sm btn-brand" data-order-food-id="${foodId}" ${ownDish ? "disabled" : ""} title="${ownDish ? "You can’t order your own dish" : "Order"}">${ownDish ? "Your dish" : "Order"}</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-reviews data-food-id="${foodId}" data-chef-id="${dishChefId(dish) ?? ""}" data-dish-title="${escHtml(dish.title)}" data-chef-name="${escHtml(dish.chef_name ?? "")}" title="View reviews"><i aria-hidden="true" class="bi bi-chat-quote"></i></button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-details="${foodId}" title="View details">Details</button><button type="button" class="btn btn-sm fav-btn ${favCls}" data-fav-food="${foodId}" data-fav-label="${escHtml(dish.title)}" title="Toggle favourite" aria-label="Favourite ${escHtml(dish.title)}" aria-pressed="${favCls ? "true" : "false"}"><i aria-hidden="true" class="bi bi-heart"></i><i aria-hidden="true" class="bi bi-heart-fill"></i></button></div></div>`;
      })
      .join("");
    const popupHtml = `<div style="min-width:220px;max-width:260px"><div class="fw-semibold">${escHtml(g.chef_name)}${g.is_own ? '<span class="badge text-bg-primary ms-1">You</span>' : ""}</div><div class="text-muted small">Tap order for a dish</div>${dishesHtml}${g.dishes.length > 8 ? `<div class="small text-muted mt-2">+ ${g.dishes.length - 8} more dishes (use List/search)</div>` : ""}</div>`;
    const icon = getPinIcon(!!g.is_own);
    const marker = icon
      ? L.marker([g.lat, g.lon], { icon })
      : L.marker([g.lat, g.lon]);
    marker.addTo(MAP_LAYER).bindPopup(popupHtml);
  }
  try {
    MAP.fitBounds(bounds, { padding: [18, 18] });
  } catch {}
}
function renderDishList() {
  if (!dishList) return;
  const list = getFilteredDishes();
  dishList.innerHTML = "";
  if (resultsSummary) {
    const countLabel = `${list.length} dish${list.length === 1 ? "" : "es"} shown${(DISH_FILTERS.sort || "newest") !== "newest" ? `, sorted by ${listingSortLabel(DISH_FILTERS.sort)}` : ""}`;
    resultsSummary.textContent = countLabel;
  }
  if (!list.length) {
    dishList.innerHTML =
      '<div class="text-muted" role="listitem">No dishes match.</div>';
    announce("No dishes match the current search and filters.", "polite");
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach((row) => {
    const foodId = row.food_id;
    const favCls = isFavFood(foodId) ? "is-fav" : "";
    const own = isOwnDish(row);
    const miles = dishDistanceMiles(row);
    const deliveryCost = dishEstimatedDeliveryCost(row);
    const el = document.createElement("article");
    el.className = `card shadow-smooth ${own ? "own-dish-card" : "border-0"}`;
    el.setAttribute("role", "listitem");
    const ownChip = own
      ? '<span class="chip own-chip"><i class="bi bi-person-fill"></i> Your dish</span>'
      : "";
    const veganChip = dishIsVegan(row)
      ? '<span class="chip"><i class="bi bi-leaf-fill"></i> Vegan</span>'
      : "";
    const portionsChip = `<span class="chip"><i class="bi bi-box-seam"></i> ${dishPortions(row)} left</span>`;
    const exp = dishExpiresAt(row);
    const expiryChip = exp
      ? `<span class="chip"><i class="bi bi-hourglass-split"></i> ${timeLeftLabel(exp)} left</span>`
      : "";
    const distanceChip =
      miles != null
        ? `<span class="chip"><i class="bi bi-signpost-split"></i> ${miles.toFixed(1)}mi</span>`
        : "";
    const deliveryChip =
      deliveryCost != null
        ? `<span class="chip"><i class="bi bi-bicycle"></i> Est. ${GBP(deliveryCost)}</span>`
        : "";
    el.innerHTML = `<div class="card-body"><div class="dish-row"><img class="list-img" src="${row.image_url || "https://placehold.co/96x72?text=Food"}" alt="${escHtml(row.title)}" /><div class="dish-main"><div class="d-flex align-items-center gap-2 flex-wrap"><div class="fw-semibold dish-title">${escHtml(row.title)}</div>${ownChip}${veganChip}${portionsChip}${expiryChip}${distanceChip}${deliveryChip}</div><div class="muted small dish-sub">${escHtml(row.chef_name ?? "(unknown)")} · ${escHtml(row.category ?? "")} · ${new Date(row.created_at).toLocaleString()}</div><div class="small mt-2">${escHtml(row.description || "").slice(0, 120)}${(row.description || "").length > 120 ? "…" : ""}</div></div><div class="dish-actions ms-auto"><div class="fw-semibold">${GBP(row.price)}</div><button type="button" class="btn btn-sm btn-brand" data-order-food-id="${foodId}" aria-label="${own ? "You cannot order your own dish" : "Order " + escHtml(row.title)}" title="${own ? "You can’t order your own dish" : ""}" ${own ? "disabled" : ""}>${own ? "Your dish" : "Order"}</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-details="${foodId}" title="View details">Details</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-reviews data-food-id="${foodId}" data-chef-id="${dishChefId(row) ?? ""}" data-dish-title="${escHtml(row.title)}" data-chef-name="${escHtml(row.chef_name ?? "")}" aria-label="View reviews for ${escHtml(row.chef_name ?? "chef")}"><i aria-hidden="true" class="bi bi-chat-quote"></i></button><button type="button" class="btn btn-sm fav-btn ${favCls}" data-fav-food="${foodId}" data-fav-label="${escHtml(row.title)}" aria-label="Favourite ${escHtml(row.title)}" aria-pressed="${favCls ? "true" : "false"}"><i aria-hidden="true" class="bi bi-heart"></i><i aria-hidden="true" class="bi bi-heart-fill"></i></button></div></div></div>`;
    frag.appendChild(el);
  });
  dishList.appendChild(frag);
  if (LOC_VIEW === "map") {
    ensureMap();
    setTimeout(() => {
      try {
        MAP?.invalidateSize(true);
        renderMap();
      } catch {}
    }, 0);
  }
}
function renderFavsModal() {
  if (!favDishList) return;
  favDishList.innerHTML = "";
  const rows = DISHES.filter((d) => isFavFood(d.food_id)).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  if (!rows.length) {
    favDishList.innerHTML =
      '<div class="text-muted" role="listitem">No favourites yet.</div>';
    announce("No favourites saved.", "polite");
    return;
  }
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const foodId = Number(row.food_id);
    const own = isOwnDish(row);
    const soldOut = dishPortions(row) <= 0;
    const unavailable = dishIsArchived(row) || dishIsExpired(row);
    const disableOrder = own || soldOut || unavailable;
    const orderLabel = own
      ? "Your dish"
      : soldOut
        ? "Sold out"
        : unavailable
          ? "Unavailable"
          : "Order";
    const orderTitle = own
      ? "You can’t order your own dish"
      : soldOut
        ? "No portions left"
        : unavailable
          ? "This dish is no longer available"
          : "Order this dish";
    const chefId = dishChefId(row) ?? "";
    const miles = dishDistanceMiles(row);
    const el = document.createElement("div");
    el.className = "p-2 border rounded";
    el.innerHTML = `<div class="d-flex align-items-start gap-3"><img class="list-img" style="width:72px;height:54px" src="${row.image_url || "https://placehold.co/96x72?text=Food"}" alt="${escHtml(row.title)}" /><div class="flex-grow-1" style="min-width:0"><div class="fw-semibold text-truncate">${escHtml(row.title)}</div><div class="text-muted small">${escHtml(row.chef_name ?? "")} • ${escHtml(row.category ?? "")}${miles != null ? ` • ${miles.toFixed(1)}mi` : ""}</div><div class="mt-1 fw-semibold">${GBP(row.price)}</div><div class="d-flex gap-2 mt-2 flex-wrap"><button type="button" class="btn btn-sm btn-brand" data-order-food-id="${foodId}" ${disableOrder ? "disabled" : ""} title="${escHtml(orderTitle)}">${escHtml(orderLabel)}</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-details="${foodId}" title="View details">Details</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-reviews data-food-id="${foodId}" data-chef-id="${chefId}" data-dish-title="${escHtml(row.title)}" data-chef-name="${escHtml(row.chef_name ?? "")}" title="View reviews"><i aria-hidden="true" class="bi bi-chat-quote"></i></button></div></div><button type="button" class="btn btn-sm fav-btn is-fav" data-fav-food="${foodId}" data-fav-label="${escHtml(row.title)}" aria-label="Unfavourite ${escHtml(row.title)}" aria-pressed="true" title="Unfavourite"><i aria-hidden="true" class="bi bi-heart"></i><i aria-hidden="true" class="bi bi-heart-fill"></i></button></div>`;
    frag.appendChild(el);
  });
  favDishList.appendChild(frag);
}

async function loadDishes() {
  if (statusEl) {
    statusEl.classList.remove("d-none");
    statusEl.className = "alert alert-secondary py-2";
    statusEl.textContent = "Loading dishes…";
  }
  if (dishList) dishList.innerHTML = "";
  const { data, error } = await db.rpc("get_food_list");
  if (error) {
    err("rpc api.get_food_list error", error);
    if (statusEl) {
      statusEl.className = "alert alert-danger py-2";
      statusEl.textContent =
        error.message || error.code || "Failed to load dishes.";
    }
    return;
  }
  if (statusEl) statusEl.classList.add("d-none");
  DISHES = Array.isArray(data) ? data.slice() : [];
  DISHES = await enrichDishesFromFoodTable(DISHES);
  syncFiltersUI();
  await refreshFavsFromDb();
  renderFavsIcon();
  renderDishList();
  if (LOC_VIEW === "map") {
    ensureMap();
    setTimeout(() => {
      try {
        MAP?.invalidateSize(true);
        renderMap();
      } catch {}
    }, 0);
  }
}
dishSearch?.addEventListener("input", () => {
  renderDishList();
  if (LOC_VIEW === "map") renderMap();
});
btnOpenFilters?.addEventListener("click", () => {
  syncFiltersUI();
  filtersModal?.show();
});
btnApplyFilters?.addEventListener("click", () => {
  const exclude = Array.from(document.querySelectorAll("[data-allergen-key]"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.getAttribute("data-allergen-key"))
    .filter(Boolean);
  DISH_FILTERS = {
    ...DISH_FILTERS,
    veganOnly: !!fltVeganOnly?.checked,
    exclude,
    custom: (fltCustomAllergens?.value || "").trim(),
  };
  saveDishFilters(DISH_FILTERS);
  syncFiltersUI();
  filtersModal?.hide();
  renderDishList();
  if (LOC_VIEW === "map") renderMap();
});
btnClearFilters?.addEventListener("click", () => {
  DISH_FILTERS = {
    ...defaultDishFilters(),
    sort: DISH_FILTERS.sort || "newest",
  };
  saveDishFilters(DISH_FILTERS);
  syncFiltersUI();
  renderDishList();
  if (LOC_VIEW === "map") renderMap();
});
dishSort?.addEventListener("change", (e) => {
  DISH_FILTERS.sort = e.target.value || "newest";
  saveDishFilters(DISH_FILTERS);
  syncFiltersUI();
  renderDishList();
  if (LOC_VIEW === "map") renderMap();
});
quickFilterButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    const key = btn.dataset.quickFilter;
    if (key === "under5")
      DISH_FILTERS.maxPrice = DISH_FILTERS.maxPrice === 5 ? null : 5;
    if (key === "nearby") DISH_FILTERS.nearbyOnly = !DISH_FILTERS.nearbyOnly;
    if (key === "pickup") DISH_FILTERS.pickupOnly = !DISH_FILTERS.pickupOnly;
    if (key === "today") DISH_FILTERS.expiringSoon = !DISH_FILTERS.expiringSoon;
    saveDishFilters(DISH_FILTERS);
    syncFiltersUI();
    renderDishList();
    if (LOC_VIEW === "map") renderMap();
  }),
);

const IMAGE_BUCKET = "food-images";
const ORDER_SNAPSHOT_PREFIX = "gfg_order_snapshot_";
let EDIT_LISTING_CTX = null;
function maybeOrderStatus(order) {
  return order?.order_status ?? order?.status ?? "Placed";
}
function isActiveOrderStatus(status) {
  const s = normalizeOrderStatus(status);
  return [
    "placed",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "reported",
  ].includes(s);
}
function nextOrderActions(order) {
  const s = normalizeOrderStatus(maybeOrderStatus(order));
  const delivery =
    String(order?.delivery_method || "").toLowerCase() === "delivery";
  if (s === "placed") return ["accepted", "cancelled"];
  if (s === "accepted") return ["preparing", "cancelled"];
  if (s === "preparing")
    return [delivery ? "out_for_delivery" : "ready", "cancelled"];
  if (s === "ready") return ["completed"];
  if (s === "out_for_delivery") return ["completed"];
  return [];
}
function orderActionLabel(status) {
  return labelOrderStatus(status);
}
async function updateOrderStatus(orderId, nextStatus) {
  const payload = {
    p_order_id: Number(orderId),
    p_status: nextStatus,
    p_status_note: null,
  };

  const { data, error } = await db.rpc("update_order_status", payload);

  if (error) {
    return { ok: false, error };
  }

  if (data && data.ok === false) {
    return {
      ok: false,
      error: new Error(data.error || "Could not update order status."),
    };
  }

  return { ok: true, data };
}
async function uploadSelectedFile(file, folder = "listing") {
  if (!file) return null;
  const userId = DBPROFILE?.user_id || "anon";
  const safeName = String(file.name || "image").replace(
    /[^a-zA-Z0-9._-]+/g,
    "_",
  );
  const path = `${folder}/${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
function buildAllergenCheckboxes(targetWrap, targetNone, selected = []) {
  if (!targetWrap || targetWrap.dataset.built) {
    if (targetWrap) {
      targetWrap
        .querySelectorAll("[data-up-allergen-key], [data-edit-allergen-key]")
        .forEach((cb) => {
          const key =
            cb.getAttribute("data-up-allergen-key") ||
            cb.getAttribute("data-edit-allergen-key");
          cb.checked = selected.includes(key);
        });
    }
    if (targetNone) targetNone.checked = !selected.length;
    return;
  }
  targetWrap.dataset.built = "1";
  targetWrap.innerHTML = ALLERGENS.map((a) => {
    const prefix = targetWrap.id === "edAllergensWrap" ? "edit" : "up";
    const attr =
      prefix === "edit" ? "data-edit-allergen-key" : "data-up-allergen-key";
    const id = `${prefix}Alg_${a.key}`;
    return `<div class="col-6"><div class="form-check"><input class="form-check-input" type="checkbox" id="${id}" ${attr}="${a.key}" ${selected.includes(a.key) ? "checked" : ""}/><label class="form-check-label" for="${id}">${a.label}</label></div></div>`;
  }).join("");
  targetNone?.addEventListener("change", () => {
    if (!targetNone.checked) return;
    targetWrap
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
  });
  targetWrap.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.checked && targetNone) targetNone.checked = false;
  });
}
function selectedAllergensFromWrap(targetWrap, targetNone) {
  const attr =
    targetWrap?.id === "edAllergensWrap"
      ? "[data-edit-allergen-key]"
      : "[data-up-allergen-key]";
  const items = Array.from(targetWrap?.querySelectorAll(attr) || [])
    .filter((cb) => cb.checked)
    .map(
      (cb) =>
        cb.getAttribute("data-edit-allergen-key") ||
        cb.getAttribute("data-up-allergen-key"),
    )
    .filter(Boolean);
  return targetNone?.checked ? ["n/a"] : items;
}
async function fetchMyListings() {
  const me = Number(DBPROFILE?.user_id);
  if (!Number.isFinite(me)) return [];
  const { data, error } = await db
    .from("food")
    .select("*")
    .eq("user_id", me)
    .order("created_at", { ascending: false });
  if (error) {
    warn("fetchMyListings failed", error);
    return [];
  }
  return data || [];
}
function openEditListing(foodId, listings) {
  const row = (listings || []).find(
    (d) => Number(d.food_id) === Number(foodId),
  );
  if (!row) return;
  EDIT_LISTING_CTX = row;
  if (edFoodId) edFoodId.value = String(row.food_id);
  if (edTitle) edTitle.value = row.title || "";
  if (edDesc) edDesc.value = row.description || "";
  if (edCat) edCat.value = row.category || "";
  if (edPrice) edPrice.value = row.price ?? "";
  if (edPortions)
    edPortions.value = row.portions_available ?? row.portions ?? 0;
  if (edDeliveryRate)
    edDeliveryRate.value =
      row.delivery_rate_per_mile ?? row.delivery_rate ?? "";
  if (edImg) edImg.value = row.image_url || "";
  if (edIngredients) edIngredients.value = row.ingredients || "";
  if (edPrepDate) edPrepDate.value = row.prep_date || "";
  if (edStatusNote) edStatusNote.value = row.status_note || "";
  if (edPickup) edPickup.checked = toBool(row.pickup_available ?? true);
  if (edDelivery) edDelivery.checked = toBool(row.delivery_available);
  if (edVegan) edVegan.checked = dishIsVegan(row);
  if (edExpiryDays) edExpiryDays.value = "";
  if (editListingMsg)
    setMsg(editListingMsg, "muted", "Update the fields you want to change.");
  const selected =
    dishAllergensText(row) && dishAllergensText(row).toLowerCase() !== "n/a"
      ? parseTokens(dishAllergensText(row))
      : [];
  buildAllergenCheckboxes(edAllergensWrap, edAllergensNone, selected);
  if (edAllergensNone) edAllergensNone.checked = !selected.length;
  editListingModal?.show();
}
function chefListingCard(row) {
  const exp = dishExpiresAt(row);
  const miles = dishDistanceMiles(row);
  return `<div class="card shadow-smooth border-0 section-card"><div class="card-body"><div class="d-flex justify-content-between gap-2 align-items-start"><div><div class="fw-semibold">${escHtml(row.title)}</div><div class="small text-muted">${escHtml(row.category || "")} · ${GBP(row.price)} · ${dishPortions(row)} left${exp ? ` · ${timeLeftLabel(exp)} left` : ""}${miles != null ? ` · ${miles.toFixed(1)}mi` : ""}</div></div><div>${toBool(row.is_archived) ? '<span class="badge text-bg-secondary">Archived</span>' : ""}</div></div><div class="small mt-2">${escHtml(row.description || "").slice(0, 100)}${(row.description || "").length > 100 ? "…" : ""}</div><div class="d-flex gap-2 mt-3 flex-wrap"><button type="button" class="btn btn-sm btn-outline-secondary" data-edit-listing="${row.food_id}">Edit</button><button type="button" class="btn btn-sm btn-outline-secondary" data-open-details="${row.food_id}">Details</button></div></div></div>`;
}
function orderActionsHtml(order) {
  return nextOrderActions(order)
    .map(
      (status) =>
        `<button type="button" class="btn btn-sm btn-outline-secondary" data-order-status="${status}" data-order-id="${Number(order.order_id)}">${escHtml(orderActionLabel(status))}</button>`,
    )
    .join("");
}
function syncOrderStatusNotifications(rawOrders, role = "user") {
  const uid = Number(DBPROFILE?.user_id);
  if (!Number.isFinite(uid)) return;
  const key = `${ORDER_SNAPSHOT_PREFIX}${uid}_${role}`;
  let prev = {};
  try {
    prev = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    prev = {};
  }
  const next = {};
  for (const order of rawOrders || []) {
    const id = String(order.order_id);
    const status = normalizeOrderStatus(maybeOrderStatus(order));
    next[id] = status;
    if (prev[id] && prev[id] !== status) {
      pushNotification(
        `Order status changed to ${labelOrderStatus(status)}`,
        `${order.title || "Order"} · #${order.order_id}`,
        "status",
        { order_id: order.order_id },
      );
    }
  }
  localStorage.setItem(key, JSON.stringify(next));
}
async function loadOrdersAndDashboard() {
  if (!ordersDashboard) return;
  ordersDashboard.innerHTML =
    '<div class="text-muted small">Loading your dashboard…</div>';
  if (!DBPROFILE?.user_id) {
    ordersDashboard.innerHTML =
      '<div class="alert alert-warning small">Sign in and finish setting up your profile to see your dashboard.</div>';
    return;
  }
  if (DBPROFILE.user_group !== "moderator") await refreshReportCacheFromDb();
  try {
    if (DBPROFILE.user_group === "moderator") {
      uploadSection?.classList.add("d-none");
      const [pendingRpc, resolvedRes] = await Promise.all([
        db.rpc("get_pending_reports"),
        db
          .from("reports")
          .select(
            "report_id, order_id, strike_value, reason, is_accepted, moderator, created_at",
          )
          .not("is_accepted", "is", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      MOD_PENDING_REPORTS = Array.isArray(pendingRpc.data)
        ? pendingRpc.data
        : [];
      const resolved = resolvedRes.data || [];
      syncModeratorPendingCount();
      renderPendingReportsList();
      ordersDashboard.innerHTML = `<div class="card shadow-smooth border-0 mb-3"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-2"><div><h5 class="mb-0">Moderator dashboard</h5><div class="small text-muted">Pending reports are prioritised first.</div></div><button type="button" class="btn btn-sm btn-brand" id="btnOpenReports"><i class="bi bi-shield-check me-1"></i>Review reports <span class="badge text-bg-light ms-1" id="modPendingCount">${MOD_PENDING_REPORTS.length}</span></button></div><div class="row g-3 mt-1"><div class="col-6"><div class="kpi-card"><div class="small text-muted">Pending</div><div class="fw-semibold fs-5">${MOD_PENDING_REPORTS.length}</div></div></div><div class="col-6"><div class="kpi-card"><div class="small text-muted">Recently resolved</div><div class="fw-semibold fs-5">${resolved.length}</div></div></div></div></div></div><div class="card shadow-smooth border-0"><div class="card-body"><h6 class="mb-2">Recently resolved reports</h6>${resolved.length ? resolved.map((r) => `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between"><div>Order #${r.order_id}</div><div>${badgeHtmlForDecision(r.is_accepted)}</div></div><div class="text-muted">${new Date(r.created_at).toLocaleString()} · Reviewed by ${escHtml(r.moderator || "Unknown")}</div><div class="mt-1">${escHtml(r.reason || "")}</div></div>`).join("") : '<div class="text-muted small">No resolved reports yet.</div>'}</div></div>`;
      document
        .getElementById("btnOpenReports")
        ?.addEventListener("click", async () => {
          await fetchPendingReports();
          modReportsModal?.show();
        });
      return;
    }

    const me = DBPROFILE.user_id;
    const [placedRes, reportsByMeRes] = await Promise.all([
      db
        .from("user_orders_v")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("reports")
        .select(
          "report_id, order_id, reason, is_accepted, moderator, created_at",
        )
        .eq("reporter_id", me)
        .order("created_at", { ascending: false }),
    ]);
    const placedRaw = placedRes.data || [];
    const reportsByMe = reportsByMeRes.data || [];
    syncOrderStatusNotifications(
      placedRaw,
      DBPROFILE.user_group === "chef" ? "chef-buyer" : "user",
    );

    if (DBPROFILE.user_group === "chef") {
      const [receivedRes, favRes, repRes, myListingsRes] = await Promise.all([
        db
          .from("chef_orders_v")
          .select("*")
          .order("created_at", { ascending: false }),
        db
          .from("favourite_counts_v")
          .select("chef_id, food_id, fav_count")
          .eq("chef_id", me),
        db
          .from("reports")
          .select(
            "report_id, order_id, reporter_id, reported_chef_id, strike_value, reason, is_accepted, moderator, created_at",
          )
          .eq("reported_chef_id", me)
          .order("created_at", { ascending: false }),
        fetchMyListings(),
      ]);
      const receivedRaw = receivedRes.data || [];
      const favStats = favRes.data || [];
      const reports = repRes.data || [];
      const myListings = myListingsRes || [];
      syncOrderStatusNotifications(receivedRaw, "chef-seller");
      const received = receivedRaw.length ? receivedRaw : [];
      const placed = placedRaw.length ? placedRaw : [];
      const activeReceived = received.filter((o) =>
        isActiveOrderStatus(maybeOrderStatus(o)),
      );
      const activePlaced = placed.filter((o) =>
        isActiveOrderStatus(maybeOrderStatus(o)),
      );
      const lifetime = received.reduce(
        (sum, o) => sum + Number(o.total_price || 0),
        0,
      );
      const totalOrders = received.length;
      const totalFavs = favStats.reduce(
        (sum, f) => sum + Number(f.fav_count || 0),
        0,
      );
      const totalStrikes = reports
        .filter((r) => String(r.is_accepted || "").toLowerCase() === "yes")
        .reduce((sum, r) => sum + Number(r.strike_value || 0), 0);
      const avgOrderValue = totalOrders ? lifetime / totalOrders : 0;
      const lowStock = myListings.filter(
        (d) => dishPortions(d) > 0 && dishPortions(d) <= 2,
      ).length;
      const expiringSoon = myListings.filter((d) => {
        const exp = dishExpiresAt(d);
        if (!exp) return false;
        const ms = new Date(exp).getTime() - Date.now();
        return ms > 0 && ms <= 24 * 60 * 60 * 1000;
      }).length;
      const topDish =
        Object.values(
          received.reduce((acc, order) => {
            const key = order.food_id || order.title;
            acc[key] = acc[key] || { title: order.title, count: 0, revenue: 0 };
            acc[key].count += Number(order.quantity || 1);
            acc[key].revenue += Number(order.total_price || 0);
            return acc;
          }, {}),
        ).sort((a, b) => b.revenue - a.revenue)[0] || null;
      const favBreakdown = favStats
        .map((f) => {
          const dish = myListings.find(
            (d) => Number(d.food_id) === Number(f.food_id),
          );
          return {
            food_id: f.food_id,
            fav_count: f.fav_count,
            title: dish?.title || `Dish #${f.food_id}`,
            price: dish?.price || dish?.listing_price || null,
          };
        })
        .sort((a, b) => Number(b.fav_count || 0) - Number(a.fav_count || 0));
      const activeReceivedHtml = activeReceived.length
        ? activeReceived
            .map(
              (o) =>
                `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between align-items-start gap-2"><div><div class="fw-semibold">${escHtml(o.title)}</div><div class="text-muted">Buyer: ${escHtml(o.buyer_name || "Customer")} · ${new Date(o.created_at).toLocaleString()}</div><div class="mt-1">${orderStatusBadge(maybeOrderStatus(o))}</div></div><div class="text-end"><div class="fw-semibold">${GBP(o.total_price)}</div><div class="small text-muted">${o.delivery_method === "delivery" ? "Delivery" : "Pickup"}</div></div></div><div class="d-flex gap-2 flex-wrap mt-2">${orderActionsHtml(o)}</div></div>`,
            )
            .join("")
        : '<div class="text-muted small">No active orders for your dishes.</div>';
      const activePlacedHtml = activePlaced.length
        ? activePlaced
            .map(
              (o) =>
                `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between align-items-start gap-2"><div><div class="fw-semibold">${escHtml(o.title)}</div><div class="text-muted">Chef: ${escHtml(o.chef_name || "Chef")} · ${new Date(o.created_at).toLocaleString()}</div><div class="mt-1">${orderStatusBadge(maybeOrderStatus(o))}</div></div><div class="text-end"><div class="fw-semibold">${GBP(o.total_price)}</div></div></div><div class="d-flex gap-2 flex-wrap mt-2"><button type="button" class="btn btn-sm btn-outline-secondary" data-review-order-id="${Number(o.order_id || 0)}" data-review-food-id="${Number(o.food_id || 0)}" data-review-chef-id="${Number(o.chef_id || 0)}" data-review-dish-title="${escHtml(o.title)}" data-review-chef-name="${escHtml(o.chef_name || "Chef")}">Review</button><button type="button" class="btn btn-sm btn-outline-danger" data-report-order-id="${Number(o.order_id || 0)}" data-report-chef-id="${Number(o.chef_id || 0)}" data-report-food-id="${Number(o.food_id || 0)}" ${hasReportedOrderLocal(o.order_id) || hasReportedFoodLocal(o.food_id) ? "disabled" : ""}>Report</button></div></div>`,
            )
            .join("")
        : '<div class="text-muted small">No active orders you have placed.</div>';
      const listingCards = myListings.length
        ? myListings.map(chefListingCard).join("")
        : '<div class="text-muted small">No listings yet. Create your first listing below.</div>';
      const reportsHtml = reports.length
        ? reports
            .slice(0, 8)
            .map(
              (r) =>
                `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between"><div>Order #${r.order_id}</div><div>${badgeHtmlForDecision(r.is_accepted || "Pending Decision")}</div></div><div class="text-muted">${new Date(r.created_at).toLocaleString()}</div><div class="mt-1">${escHtml(r.reason || "")}</div></div>`,
            )
            .join("")
        : '<div class="text-muted small">No reports received.</div>';
      const favHtml = favBreakdown.length
        ? favBreakdown
            .map(
              (d) =>
                `<div class="d-flex justify-content-between small border-bottom py-2"><div><div class="fw-semibold">${escHtml(d.title)}</div>${d.price != null ? `<div class="text-muted">${GBP(d.price)}</div>` : ""}</div><div>${d.fav_count} ♥</div></div>`,
            )
            .join("")
        : '<div class="text-muted small">No favourites yet.</div>';
      const historyHtml = placed.length
        ? placed
            .slice(0, 10)
            .map(
              (o) =>
                `<div class="d-flex align-items-start gap-2 border-bottom py-2 small"><img src="${o.image_url || "https://placehold.co/72x54?text=Food"}" alt="${escHtml(o.title)}" style="width:72px;height:54px;border-radius:8px;object-fit:cover" /><div class="flex-grow-1" style="min-width:0"><div class="fw-semibold text-truncate">${escHtml(o.title)}</div><div class="text-muted">${escHtml(o.chef_name || "Chef")} · ${new Date(o.created_at).toLocaleString()}</div><div class="mt-1">${orderStatusBadge(maybeOrderStatus(o))}</div></div><div class="text-end"><div>${GBP(o.total_price)}</div></div></div>`,
            )
            .join("")
        : '<div class="text-muted small">No orders placed yet.</div>';
      ordersDashboard.innerHTML = `<div class="card shadow-smooth border-0 mb-3"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><div><h5 class="mb-0">Chef dashboard</h5><div class="small text-muted">Active work first, then your listings and analytics.</div></div><button type="button" class="btn btn-sm btn-brand" id="btnShowUpload"><i class="bi bi-plus-circle me-1"></i>New listing</button></div><div class="row g-2"><div class="col-6 col-md-3"><div class="kpi-card"><div class="small text-muted">Lifetime earnings</div><div class="fw-semibold fs-5">${GBP(lifetime)}</div></div></div><div class="col-6 col-md-3"><div class="kpi-card"><div class="small text-muted">Average order</div><div class="fw-semibold fs-5">${GBP(avgOrderValue)}</div></div></div><div class="col-6 col-md-3"><div class="kpi-card"><div class="small text-muted">Low stock</div><div class="fw-semibold fs-5">${lowStock}</div></div></div><div class="col-6 col-md-3"><div class="kpi-card"><div class="small text-muted">Expiring soon</div><div class="fw-semibold fs-5">${expiringSoon}</div></div></div></div>${topDish ? `<div class="alert alert-light small mt-3 mb-0">Top earning dish: <strong>${escHtml(topDish.title)}</strong> (${GBP(topDish.revenue)})</div>` : ""}</div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Active orders for your dishes</h6>${activeReceivedHtml}</div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Orders you placed</h6>${activePlacedHtml}<div class="small text-muted mt-2">Completed orders remain below in order history.</div></div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Manage your listings</h6><div class="listing-admin-grid">${listingCards}</div></div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Order history</h6>${historyHtml}</div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Favourites breakdown</h6>${favHtml}</div></div><div class="card shadow-smooth border-0"><div class="card-body"><h6 class="mb-2">Reports and strikes</h6><div class="small text-muted mb-2">Accepted reports contribute to strikes.</div><div class="mb-2"><strong>Total strikes:</strong> ${totalStrikes}</div>${reportsHtml}</div></div>`;
      document
        .getElementById("btnShowUpload")
        ?.addEventListener("click", () => {
          uploadSection?.classList.remove("d-none");
          if (uploadSection)
            window.scrollTo({
              top: uploadSection.offsetTop - 80,
              behavior: access.reduceMotion ? "auto" : "smooth",
            });
        });
      ordersDashboard
        .querySelectorAll("[data-edit-listing]")
        .forEach((btn) =>
          btn.addEventListener("click", () =>
            openEditListing(btn.getAttribute("data-edit-listing"), myListings),
          ),
        );
      return;
    }

    const orders = placedRaw.length ? placedRaw : [];
    const activeOrders = orders.filter((o) =>
      isActiveOrderStatus(maybeOrderStatus(o)),
    );
    const pastOrders = orders.filter(
      (o) => !isActiveOrderStatus(maybeOrderStatus(o)),
    );
    const reportsHtml = reportsByMe.length
      ? reportsByMe
          .slice(0, 8)
          .map(
            (r) =>
              `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between"><div>Order #${r.order_id}</div><div>${badgeHtmlForDecision(r.is_accepted || "Pending Decision")}</div></div><div class="text-muted">${new Date(r.created_at).toLocaleString()}</div><div class="mt-1">${escHtml(r.reason || "")}</div></div>`,
          )
          .join("")
      : '<div class="text-muted small">No reports submitted.</div>';
    const activeHtml = activeOrders.length
      ? activeOrders
          .map(
            (o) =>
              `<div class="border rounded p-2 mb-2 small"><div class="d-flex justify-content-between gap-2 align-items-start"><div><div class="fw-semibold">${escHtml(o.title)}</div><div class="text-muted">${escHtml(o.chef_name || "Chef")} · ${new Date(o.created_at).toLocaleString()}</div><div class="mt-1">${orderStatusBadge(maybeOrderStatus(o))}</div></div><div class="text-end"><div class="fw-semibold">${GBP(o.total_price)}</div>${o.delivery_cost ? `<div class="text-muted">incl. ${GBP(o.delivery_cost)} delivery</div>` : ""}</div></div><div class="d-flex gap-2 mt-2 flex-wrap"><button type="button" class="btn btn-sm btn-outline-secondary" data-review-order-id="${Number(o.order_id || 0)}" data-review-food-id="${Number(o.food_id || 0)}" data-review-chef-id="${Number(o.chef_id || 0)}" data-review-dish-title="${escHtml(o.title)}" data-review-chef-name="${escHtml(o.chef_name || "Chef")}">Review</button><button type="button" class="btn btn-sm btn-outline-danger" data-report-order-id="${Number(o.order_id || 0)}" data-report-chef-id="${Number(o.chef_id || 0)}" data-report-food-id="${Number(o.food_id || 0)}" ${hasReportedOrderLocal(o.order_id) || hasReportedFoodLocal(o.food_id) ? "disabled" : ""}>Report</button></div></div>`,
          )
          .join("")
      : '<div class="text-muted small">No active orders right now.</div>';
    const historyHtml = pastOrders.length
      ? pastOrders
          .map(
            (o) =>
              `<div class="d-flex align-items-start gap-2 border-bottom py-2 small"><img src="${o.image_url || "https://placehold.co/72x54?text=Food"}" alt="${escHtml(o.title)}" style="width:72px;height:54px;border-radius:8px;object-fit:cover" /><div class="flex-grow-1" style="min-width:0"><div class="fw-semibold text-truncate">${escHtml(o.title)}</div><div class="text-muted">${escHtml(o.chef_name || "Chef")} · ${new Date(o.created_at).toLocaleString()}</div><div class="mt-1">${orderStatusBadge(maybeOrderStatus(o))}</div></div><div class="text-end"><div>${GBP(o.total_price)}</div></div></div>`,
          )
          .join("")
      : '<div class="text-muted small">No completed or cancelled orders yet.</div>';
    ordersDashboard.innerHTML = `<div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h5 class="mb-2">Your dashboard</h5><div class="small text-muted">Active orders are shown first so it is easier to track what still needs attention.</div></div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Active orders</h6>${activeHtml}</div></div><div class="card shadow-smooth border-0 mb-3"><div class="card-body"><h6 class="mb-2">Past orders</h6>${historyHtml}</div></div><div class="card shadow-smooth border-0"><div class="card-body"><h6 class="mb-2">Your reports</h6>${reportsHtml}</div></div>`;
    uploadSection?.classList.add("d-none");
  } catch (e) {
    console.error("loadOrdersAndDashboard error", e);
    ordersDashboard.innerHTML =
      '<div class="alert alert-danger small">Could not load the dashboard. Try again later.</div>';
  }
}

orderForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitter =
    e.submitter ||
    (document.activeElement instanceof HTMLButtonElement
      ? document.activeElement
      : null);
  if (!submitter?.matches?.("[data-confirm-order]")) return;
  if (!ORDER_CTX) {
    setMsg(orderMsg, "danger", "No dish selected.");
    return;
  }
  if (!DBPROFILE?.user_id) {
    setMsg(
      orderMsg,
      "danger",
      "You need to finish setting up your profile before ordering.",
    );
    onboardModal?.show();
    return;
  }
  const dish = ORDER_CTX?.dish;
  if (dish && isOwnDish(dish)) {
    setMsg(orderMsg, "danger", "You can’t order your own dish.");
    return;
  }
  const maxQty = Math.max(1, dishPortions(dish));
  const qty = (() => {
    const q = Number(orderQty?.value ?? 1);
    const qi = Number.isFinite(q) ? Math.floor(q) : 1;
    return Math.max(1, Math.min(maxQty, qi));
  })();
  if (orderQty) orderQty.value = String(qty);
  if (qty > dishPortions(dish)) {
    setMsg(
      orderMsg,
      "danger",
      "Not enough portions available for that quantity.",
    );
    await loadDishes();
    return;
  }
  const method = orderDeliveryRadio?.checked
    ? "delivery"
    : orderPickupRadio?.checked
      ? "pickup"
      : null;
  if (!method) {
    setMsg(orderMsg, "danger", "Please choose pickup or delivery.");
    return;
  }
  if (dishPortions(dish) <= 0) {
    setMsg(orderMsg, "danger", "Sorry - this dish is sold out.");
    await loadDishes();
    return;
  }
  setMsg(orderMsg, "muted", "Placing order…");
  try {
    let deliveryCost = 0;
    if (
      method === "delivery" &&
      ORDER_CTX.distanceMiles != null &&
      ORDER_CTX.deliveryRate > 0
    )
      deliveryCost = ORDER_CTX.distanceMiles * ORDER_CTX.deliveryRate;
    const { data, error } = await db.rpc("place_order", {
      p_food_id: Number(dish.food_id),
      p_delivery_method: method,
      p_delivery_cost: deliveryCost,
      p_quantity: qty,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const remaining = Number(row?.remaining_portions);
    const successText = Number.isFinite(remaining)
      ? `Order placed! ${remaining} portion(s) remaining.`
      : "Order placed! The chef will see this in their dashboard.";
    setMsg(orderMsg, "success", successText);
    pushNotification(
      "Order placed successfully",
      `${dish.title} · ${method === "delivery" ? "Delivery" : "Pickup"}`,
      "success",
      { food_id: dish.food_id },
    );
    setTimeout(() => orderModal?.hide(), 800);
    await loadDishes();
    await loadOrdersAndDashboard();
  } catch (e2) {
    console.error("order submit error", e2);
    setMsg(
      orderMsg,
      "danger",
      e2.message || "Could not place order. Please try again.",
    );
  }
});

// ---------- Upload ----------
const uploadForm = document.getElementById("uploadForm");
const upTitle = document.getElementById("upTitle");
const upDesc = document.getElementById("upDesc");
const upCat = document.getElementById("upCat");
const upPrice = document.getElementById("upPrice");
const upDeliveryRate = document.getElementById("upDeliveryRate");
const upPickup = document.getElementById("upPickup");
const upDelivery = document.getElementById("upDelivery");
const upVegan = document.getElementById("upVegan");
const upPortions = document.getElementById("upPortions");
const upExpiryDays = document.getElementById("upExpiryDays");
const upAllergensWrap = document.getElementById("upAllergensWrap");
const upAllergensNone = document.getElementById("upAllergensNone");
const upIngredients = document.getElementById("upIngredients");
const upPrepDate = document.getElementById("upPrepDate");
const upStatusNote = document.getElementById("upStatusNote");
const upImg = document.getElementById("upImg");
const upFile = document.getElementById("upFile");
const uploadMsg = document.getElementById("uploadMsg");
const editListingModalEl = document.getElementById("editListingModal");
const editListingModal = editListingModalEl
  ? bootstrap.Modal.getOrCreateInstance(editListingModalEl)
  : null;
const editListingForm = document.getElementById("editListingForm");
const edFoodId = document.getElementById("edFoodId");
const edTitle = document.getElementById("edTitle");
const edDesc = document.getElementById("edDesc");
const edCat = document.getElementById("edCat");
const edPrice = document.getElementById("edPrice");
const edPortions = document.getElementById("edPortions");
const edExpiryDays = document.getElementById("edExpiryDays");
const edDeliveryRate = document.getElementById("edDeliveryRate");
const edImg = document.getElementById("edImg");
const edIngredients = document.getElementById("edIngredients");
const edPrepDate = document.getElementById("edPrepDate");
const edStatusNote = document.getElementById("edStatusNote");
const edFile = document.getElementById("edFile");
const edPickup = document.getElementById("edPickup");
const edDelivery = document.getElementById("edDelivery");
const edVegan = document.getElementById("edVegan");
const edAllergensWrap = document.getElementById("edAllergensWrap");
const edAllergensNone = document.getElementById("edAllergensNone");
const editListingMsg = document.getElementById("editListingMsg");
const btnDuplicateListing = document.getElementById("btnDuplicateListing");
const btnArchiveListing = document.getElementById("btnArchiveListing");
const btnSoldOutListing = document.getElementById("btnSoldOutListing");
function buildUploadAllergensUI() {
  if (!upAllergensWrap || upAllergensWrap.dataset.built) return;
  upAllergensWrap.dataset.built = "1";
  upAllergensWrap.innerHTML = ALLERGENS.map((a) => {
    const id = `upAlg_${a.key}`;
    return `<div class="col-6"><div class="form-check"><input class="form-check-input" type="checkbox" id="${id}" data-up-allergen-key="${a.key}" /><label class="form-check-label" for="${id}">${a.label}</label></div></div>`;
  }).join("");
  upAllergensNone?.addEventListener("change", () => {
    if (!upAllergensNone.checked) return;
    upAllergensWrap
      .querySelectorAll('input[type="checkbox"][data-up-allergen-key]')
      .forEach((cb) => (cb.checked = false));
  });
  upAllergensWrap.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-up-allergen-key]")) return;
    if (target.checked && upAllergensNone) upAllergensNone.checked = false;
  });
}
buildUploadAllergensUI();
uploadForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormInvalid(uploadForm);
  setMsg(uploadMsg, "muted", "Validating…");
  if (!DBPROFILE?.user_id) {
    setMsg(
      uploadMsg,
      "danger",
      "Finish setting up your profile before uploading.",
    );
    onboardModal?.show();
    return;
  }
  if (DBPROFILE?.user_group !== "chef") {
    setMsg(uploadMsg, "danger", "Only Chef accounts can upload goods.");
    return;
  }
  const titleR = V.text(upTitle, "Title", {
    required: true,
    min: 3,
    max: 120,
    pattern: TEXT_ONLY.titleCatPattern,
  });
  if (!titleR.ok) setInvalid(upTitle, titleR.msg);
  const descR = V.text(upDesc, "Description", {
    required: true,
    min: 10,
    max: 600,
    pattern: TEXT_ONLY.descPattern,
  });
  if (!descR.ok) setInvalid(upDesc, descR.msg);
  const catR = V.text(upCat, "Category", {
    required: true,
    min: 2,
    max: 60,
    pattern: TEXT_ONLY.titleCatPattern,
  });
  if (!catR.ok) setInvalid(upCat, catR.msg);
  const priceR = V.number(upPrice, "Price (£)", {
    required: true,
    min: 0,
    max: 9999,
  });
  if (!priceR.ok) setInvalid(upPrice, priceR.msg);
  const portionsR = V.int(upPortions, "Portions available", {
    required: true,
    min: 1,
    max: 999,
  });
  if (!portionsR.ok) setInvalid(upPortions, portionsR.msg);
  const expiryR = V.int(upExpiryDays, "Expires in", {
    required: true,
    min: 1,
    max: 7,
  });
  if (!expiryR.ok) setInvalid(upExpiryDays, expiryR.msg);
  const pickup_available = !!upPickup?.checked;
  const deliveryRequested = !!upDelivery?.checked;
  if (!pickup_available && !deliveryRequested) {
    setMsg(uploadMsg, "danger", "Choose at least Pickup or Delivery.");
    setInvalid(upPickup, "Select at least one option.");
    setInvalid(upDelivery, "Select at least one option.");
    focusFirstInvalid(uploadForm);
    return;
  }
  const rateR = V.number(upDeliveryRate, "Delivery £/mile", {
    required: deliveryRequested,
    min: 0.01,
    max: 100,
  });
  if (!rateR.ok && deliveryRequested) setInvalid(upDeliveryRate, rateR.msg);
  const imgR = V.url(upImg, "Image URL", { required: false });
  if (!imgR.ok) setInvalid(upImg, imgR.msg);
  const selectedAllergens = Array.from(
    document.querySelectorAll("[data-up-allergen-key]"),
  )
    .filter((cb) => cb.checked)
    .map((cb) => cb.getAttribute("data-up-allergen-key"))
    .filter(Boolean);
  const isNone = !!upAllergensNone?.checked;
  if (isNone && selectedAllergens.length > 0) {
    setMsg(
      uploadMsg,
      "danger",
      "Choose either specific allergens OR “No allergens / N/A” (not both).",
    );
    return;
  }
  if (!isNone && selectedAllergens.length === 0) {
    setMsg(
      uploadMsg,
      "danger",
      "Allergens disclosure is required. Tick at least one allergen, or tick “No allergens / N/A”.",
    );
    return;
  }
  const hasInvalid = uploadForm.querySelector(".is-invalid");
  if (hasInvalid) {
    setMsg(uploadMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(uploadForm);
    return;
  }
  setMsg(uploadMsg, "muted", "Saving listing…");
  const expires_at = new Date(
    Date.now() + Number(expiryR.value) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const allergens_disclosure = isNone ? "n/a" : selectedAllergens.join(", ");
  let image_url = (imgR.value || "").trim();
  if (upFile?.files?.[0]) {
    try {
      setMsg(uploadMsg, "muted", "Uploading image…");
      image_url =
        (await uploadSelectedFile(upFile.files[0], "listing")) || image_url;
    } catch (uploadErr) {
      warn("upload image failed", uploadErr);
      setMsg(
        uploadMsg,
        "danger",
        `Image upload failed: ${uploadErr.message || "check bucket/policies"}. You can still use an image URL.`,
      );
      return;
    }
  }
  image_url = image_url || "https://placehold.co/600x400?text=Food";
  const delivery_available = deliveryRequested && rateR.value != null;
  const ingredientsValue = String(upIngredients?.value || "").trim();
  const prepDateValue = String(upPrepDate?.value || "").trim();
  const statusNoteValue = String(upStatusNote?.value || "").trim();

  const row = {
    user_id: DBPROFILE.user_id,
    title: titleR.value,
    description: descR.value,
    category: catR.value,
    price: priceR.value,
    portions_available: portionsR.value,
    allergens_disclosure,
    image_url,
    pickup_available,
    delivery_available,
    delivery_rate_per_mile: delivery_available ? rateR.value : null,
    is_vegan: !!upVegan?.checked,
    expires_at,
    ingredients: ingredientsValue || null,
    prep_date: prepDateValue || null,
    status_note: statusNoteValue || null,
  };
  const { data, error } = await insertFoodRowWithFallback(row);

  if (error) {
    console.error("upload insert error", error);
    setMsg(uploadMsg, "danger", error.message || "Could not save listing.");
    return;
  }
  setMsg(
    uploadMsg,
    "success",
    `Saved! Listing #${data?.food_id ?? "?"} created.`,
  );
  pushNotification(
    "Listing created",
    `${titleR.value} is now live.`,
    "success",
    { food_id: data?.food_id },
  );
  uploadForm.reset();
  await loadDishes();
  await loadOrdersAndDashboard();
});

// ---------- Auth forms ----------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormInvalid(loginForm);
  setMsg(loginMsg, "danger", "");
  const em = V.email(loginEmail, "Email");
  if (!em.ok) setInvalid(loginEmail, em.msg);
  const pw = V.text(loginPassword, "Password", {
    required: true,
    min: 6,
    max: 200,
  });
  if (!pw.ok) setInvalid(loginPassword, pw.msg);
  if (!em.ok || !pw.ok) {
    setMsg(loginMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(loginForm);
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: em.value,
    password: loginPassword.value,
  });
  if (error) {
    err("login error", error);
    setMsg(loginMsg, "danger", error.message || "Login failed.");
    return;
  }
  go("listings", true);
});
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormInvalid(signupForm);
  setMsg(signupMsg, "muted", "Creating account…");
  const em = V.email(signupEmail, "Email");
  if (!em.ok) setInvalid(signupEmail, em.msg);
  const pw = V.text(signupPassword, "Password", {
    required: true,
    min: 6,
    max: 200,
  });
  if (!pw.ok) setInvalid(signupPassword, pw.msg);
  if (!em.ok || !pw.ok) {
    setMsg(signupMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(signupForm);
    return;
  }
  const redirectTo = `${location.origin}${location.pathname}`;
  const { data, error } = await supabase.auth.signUp({
    email: em.value,
    password: signupPassword.value,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    let msg = error.message || "Could not create account.";
    if (/already registered/i.test(msg))
      msg = "That email is already registered. Try logging in.";
    if (/password/i.test(msg) && /6/i.test(msg))
      msg = "Password must be at least 6 characters.";
    setMsg(signupMsg, "danger", msg);
    return;
  }
  if (data?.session) {
    setMsg(signupMsg, "success", "Account created - redirecting…");
    go("listings", true);
  } else {
    setMsg(
      signupMsg,
      "warning",
      "Account created. Check your email to confirm, then return here.",
    );
  }
});

btnSignOut?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  clearOnbSeenUid();
  go("login", true);
});

document
  .getElementById("editProfileModal")
  ?.addEventListener("show.bs.modal", async () => {
    const { data } = await supabase.auth.getUser();
    const u = data?.user;
    if (authEmailEl) authEmailEl.textContent = u?.email || "";
    if (u?.id) {
      const { data: prof } = await getDbProfile(u.id);
      useDbProfileUI(prof || DBPROFILE);
    }
    if (fldDbName)
      fldDbName.value = DBPROFILE?.user_name || u?.email?.split("@")[0] || "";
    if (fldRole) fldRole.value = DBPROFILE?.user_group || "user";
    if (fldAvatarUrl) fldAvatarUrl.value = DBPROFILE?.avatar_url || "";
    if (fldPickupArea) fldPickupArea.value = DBPROFILE?.pickup_area || "";
    if (fldBio) fldBio.value = DBPROFILE?.bio || "";
    if (fldHygieneNote) fldHygieneNote.value = DBPROFILE?.hygiene_note || "";
    if (editMsg) {
      editMsg.className = "small";
      editMsg.textContent = "";
    }
    if (fldCurPw) fldCurPw.value = "";
    if (fldNewPw) fldNewPw.value = "";
    if (fldNewPw2) fldNewPw2.value = "";
    clearInvalid(fldCurPw);
    clearInvalid(fldNewPw);
    clearInvalid(fldNewPw2);
  });
document
  .getElementById("editProfileForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    clearFormInvalid(form);
    const unameR = V.text(fldDbName, "Username", {
      required: true,
      min: 2,
      max: 30,
      pattern: TEXT_ONLY.usernamePattern,
    });
    if (!unameR.ok) setInvalid(fldDbName, unameR.msg);
    const allowedRoles = new Set(["user", "chef", "moderator"]);
    let newRole = String(fldRole?.value || "user");
    if (!allowedRoles.has(newRole))
      setInvalid(fldRole, "Invalid role selection.");
    if (DBPROFILE?.user_group === "moderator") newRole = "moderator";
    if (form.querySelector(".is-invalid")) {
      setMsg(editMsg, "danger", "Fix the highlighted fields and try again.");
      focusFirstInvalid(form);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) {
      setMsg(editMsg, "danger", "No user session.");
      return;
    }
    setMsg(editMsg, "muted", "Saving…");
    const avatarR = V.url(fldAvatarUrl, "Profile image URL", {
      required: false,
    });
    if (!avatarR.ok) setInvalid(fldAvatarUrl, avatarR.msg);
    const bioR = V.text(fldBio, "Short bio", {
      required: false,
      min: 0,
      max: 300,
    });
    if (!bioR.ok) setInvalid(fldBio, bioR.msg);
    const areaR = V.text(fldPickupArea, "Collection / delivery area", {
      required: false,
      min: 0,
      max: 120,
    });
    if (!areaR.ok) setInvalid(fldPickupArea, areaR.msg);
    const hygieneR = V.text(fldHygieneNote, "Food safety note", {
      required: false,
      min: 0,
      max: 220,
    });
    if (!hygieneR.ok) setInvalid(fldHygieneNote, hygieneR.msg);
    if (form.querySelector(".is-invalid")) {
      setMsg(editMsg, "danger", "Fix the highlighted fields and try again.");
      focusFirstInvalid(form);
      return;
    }
    const { data: updated, error } = await db
      .from("users_v")
      .update({
        user_name: unameR.value,
        user_group: newRole,
        avatar_url: avatarR.value || null,
        bio: bioR.value || null,
        pickup_area: areaR.value || null,
        hygiene_note: hygieneR.value || null,
      })
      .eq("auth_uid", uid)
      .select("*")
      .maybeSingle();
    if (error) {
      setMsg(editMsg, "danger", error.message || "Could not update profile.");
      return;
    }
    setMsg(editMsg, "success", "Profile updated.");
    pushNotification(
      "Profile updated",
      "Your profile details were saved successfully.",
      "success",
    );
    useDbProfileUI(
      updated || {
        ...(DBPROFILE || {}),
        user_name: unameR.value,
        user_group: newRole,
        avatar_url: avatarR.value || null,
        bio: bioR.value || null,
        pickup_area: areaR.value || null,
        hygiene_note: hygieneR.value || null,
      },
    );
  });
btnChangePw?.addEventListener("click", async () => {
  const form = document.getElementById("editProfileForm");
  clearInvalid(fldCurPw);
  clearInvalid(fldNewPw);
  clearInvalid(fldNewPw2);
  const curR = V.text(fldCurPw, "Current password", {
    required: true,
    min: 6,
    max: 200,
  });
  if (!curR.ok) setInvalid(fldCurPw, "Enter your current password.");
  const newR = V.text(fldNewPw, "New password", {
    required: true,
    min: 6,
    max: 200,
  });
  if (!newR.ok)
    setInvalid(fldNewPw, "New password must be at least 6 characters.");
  const new2R = V.text(fldNewPw2, "Confirm password", {
    required: true,
    min: 6,
    max: 200,
  });
  if (!new2R.ok) setInvalid(fldNewPw2, "Please confirm your new password.");
  if (newR.ok && new2R.ok && newR.value !== new2R.value)
    setInvalid(fldNewPw2, "New password and confirmation do not match.");
  if (form?.querySelector(".is-invalid")) {
    setMsg(editMsg, "danger", "Fix the highlighted fields and try again.");
    focusFirstInvalid(form);
    return;
  }
  const { data: sessData } = await supabase.auth.getSession();
  const email =
    sessData?.session?.user?.email ||
    authEmailEl?.textContent?.trim() ||
    DBPROFILE?.email?.trim();
  if (!email) {
    setMsg(editMsg, "danger", "No session/email found. Please sign in again.");
    return;
  }
  btnChangePw.disabled = true;
  try {
    setMsg(editMsg, "muted", "Checking current password…");
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: curR.value,
    });
    if (reauthErr) {
      setInvalid(fldCurPw, "Current password is incorrect.");
      setMsg(
        editMsg,
        "danger",
        "Current password is incorrect. Please try again.",
      );
      fldCurPw?.focus();
      return;
    }
    setMsg(editMsg, "muted", "Updating password…");
    const { error: updErr } = await supabase.auth.updateUser({
      password: newR.value,
    });
    if (updErr) {
      setMsg(editMsg, "danger", updErr.message || "Could not change password.");
      return;
    }
    setMsg(editMsg, "success", "Password updated successfully.");
    fldCurPw.value = "";
    fldNewPw.value = "";
    fldNewPw2.value = "";
  } finally {
    btnChangePw.disabled = false;
  }
});
btnDeleteAccount?.addEventListener("click", async () => {
  const msg = (text, cls = "secondary") => setMsg(editMsg, cls, text);
  if (
    !confirm(
      "Delete your account? This removes your profile and your sign-in account.",
    )
  )
    return;
  msg("Deleting account…", "muted");
  btnDeleteAccount.disabled = true;
  let deletedOk = false;
  try {
    const { data, error } = await db.rpc("delete_my_account");
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Delete failed.");
    deletedOk = true;
    msg("Account deleted. Signing out…", "success");
    editProfileModal?.hide();
  } catch (e) {
    console.error("[delete_my_account] failed:", e);
    msg(e.message || "Delete failed. Please try again.", "danger");
  } finally {
    btnDeleteAccount.disabled = false;
    if (deletedOk) {
      await supabase.auth.signOut();
      clearOnbSeenUid();
      setTimeout(() => {
        document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
        document.body.classList.remove("modal-open");
      }, 0);
      setTimeout(() => go("login", true), 250);
    }
  }
});

btnOnbSave?.addEventListener("click", async () => {
  setMsg(onbMsg, "muted", "Saving…");
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u?.id) {
    setMsg(onbMsg, "danger", "No user session.");
    return;
  }
  const user_name = (onbName?.value || "").trim();
  const user_group = onbRole?.value || "user";
  if (!user_name) {
    setMsg(onbMsg, "danger", "Please enter a username.");
    return;
  }
  if (!TEXT_ONLY.usernamePattern.test(user_name)) {
    setMsg(
      onbMsg,
      "danger",
      "Username can only contain letters, spaces, _ and -.",
    );
    return;
  }
  const { data: res, error } = await upsertProfile({
    uid: u.id,
    email: u.email,
    user_name,
    user_group,
  });
  if (error) {
    setMsg(onbMsg, "danger", error.message || "Could not save profile.");
    return;
  }
  clearOnbSeenUid();
  useDbProfileUI(
    res || { user_name, user_group, email: u.email, auth_uid: u.id },
  );
  if (fldDbName) fldDbName.value = user_name;
  if (fldRole) fldRole.value = user_group;
  onboardModal?.hide();
  if (PAGE === "listings") await loadDishes();
  if (PAGE === "dashboard") await loadOrdersAndDashboard();
});

// ---------- Event delegation ----------
document.addEventListener("click", async (e) => {
  const detailsBtn = e.target.closest("[data-open-details]");
  if (detailsBtn) {
    e.preventDefault();
    await openDishDetails(detailsBtn.getAttribute("data-open-details"));
    return;
  }
  const statusBtn = e.target.closest("[data-order-status]");
  if (statusBtn) {
    e.preventDefault();
    const orderId = Number(statusBtn.getAttribute("data-order-id"));
    const nextStatus = statusBtn.getAttribute("data-order-status");
    if (!Number.isFinite(orderId) || !nextStatus) return;
    statusBtn.disabled = true;
    const res = await updateOrderStatus(orderId, nextStatus);
    if (!res.ok) {
      alert(res.error?.message || "Could not update order status.");
      statusBtn.disabled = false;
      return;
    }
    pushNotification(
      `Order marked as ${labelOrderStatus(nextStatus)}`,
      `Order #${orderId}`,
      "info",
      { order_id: orderId },
    );
    await loadOrdersAndDashboard();
    return;
  }
  const editListingBtn = e.target.closest("[data-edit-listing]");
  if (editListingBtn) {
    e.preventDefault();
    const listings = await fetchMyListings();
    openEditListing(editListingBtn.getAttribute("data-edit-listing"), listings);
    return;
  }
  const revBtn = e.target.closest("[data-open-reviews]");
  if (revBtn) {
    e.preventDefault();
    const chefId = Number(revBtn.getAttribute("data-chef-id"));
    const foodId = Number(revBtn.getAttribute("data-food-id"));
    const title = revBtn.getAttribute("data-dish-title") || "";
    const chefName = revBtn.getAttribute("data-chef-name") || "";
    if (!Number.isFinite(chefId)) return;
    openReviewsForDish({
      mode: "read",
      food_id: foodId,
      chef_id: chefId,
      title,
      chef_name: chefName,
    });
    return;
  }
  const orderBtn = e.target.closest("[data-order-food-id]");
  if (orderBtn) {
    e.preventDefault();
    if (!DBPROFILE?.user_id) {
      alert("You need to finish setting up your profile before ordering.");
      onboardModal?.show();
      return;
    }
    const foodId = Number(orderBtn.getAttribute("data-order-food-id"));
    if (!Number.isFinite(foodId)) return;
    const dish = DISHES.find((d) => d.food_id === foodId);
    if (!dish) return;
    if (isOwnDish(dish)) {
      alert("You can’t order your own dish.");
      return;
    }
    const pickupAvailable = dish.pickup_available !== false;
    const deliveryRate = Number(
      dish.delivery_rate_per_mile != null ? dish.delivery_rate_per_mile : 0,
    );
    const deliveryAvailable = !!dish.delivery_available && deliveryRate > 0;
    let distanceMiles = null;
    if (
      deliveryAvailable &&
      typeof dish.chef_lat === "number" &&
      typeof dish.chef_lon === "number"
    ) {
      const km = haversineKm(
        USER_LOC.lat,
        USER_LOC.lon,
        dish.chef_lat,
        dish.chef_lon,
      );
      distanceMiles = kmToMiles(km);
    }
    ORDER_CTX = {
      dish,
      distanceMiles,
      deliveryRate,
      pickupAvailable,
      deliveryAvailable,
    };
    const summaryParts = [
      `<strong>${dish.title}</strong> by ${dish.chef_name ?? "Chef"}`,
      `Listing price: ${GBP(dish.price)}`,
      `Portions left: ${dishPortions(dish)}`,
    ];
    if (deliveryAvailable) {
      if (distanceMiles != null)
        summaryParts.push(
          `Estimated delivery cost: ${GBP(distanceMiles * deliveryRate)} (${distanceMiles.toFixed(1)} miles at £${deliveryRate.toFixed(2)} per mile)`,
        );
      else
        summaryParts.push(
          `Delivery cost is based on distance and your chef's rate of £${deliveryRate.toFixed(2)}/mile.`,
        );
    }
    if (orderDishSummary)
      orderDishSummary.innerHTML = summaryParts
        .map((s) => `<div>${s}</div>`)
        .join("");
    if (orderPickupRadio) orderPickupRadio.disabled = !pickupAvailable;
    if (orderDeliveryRadio) orderDeliveryRadio.disabled = !deliveryAvailable;
    if (!orderPickupRadio?.disabled) {
      orderPickupRadio.checked = true;
      if (orderDeliveryRadio) orderDeliveryRadio.checked = false;
    } else if (!orderDeliveryRadio?.disabled) {
      orderDeliveryRadio.checked = true;
      if (orderPickupRadio) orderPickupRadio.checked = false;
    } else {
      if (orderPickupRadio) orderPickupRadio.checked = false;
      if (orderDeliveryRadio) orderDeliveryRadio.checked = false;
    }
    if (orderQty) {
      const maxQty = Math.max(1, dishPortions(dish));
      orderQty.min = "1";
      orderQty.max = String(maxQty);
      orderQty.value = "1";
    }
    if (orderQtyMax)
      orderQtyMax.textContent = String(Math.max(1, dishPortions(dish)));
    if (orderMsg) {
      orderMsg.className = "small";
      orderMsg.textContent = "";
    }
    updateOrderPriceDisplay();
    orderModal?.show();
    return;
  }
  const reviewOrderBtn = e.target.closest("[data-review-order-id]");
  if (reviewOrderBtn) {
    e.preventDefault();
    if (!DBPROFILE?.user_id) {
      alert("You need to finish setting up your profile before reviewing.");
      onboardModal?.show();
      return;
    }
    const orderId = Number(reviewOrderBtn.getAttribute("data-review-order-id"));
    const foodId = Number(reviewOrderBtn.getAttribute("data-review-food-id"));
    const chefId = Number(reviewOrderBtn.getAttribute("data-review-chef-id"));
    const title = reviewOrderBtn.getAttribute("data-review-dish-title") || "";
    const chefName = reviewOrderBtn.getAttribute("data-review-chef-name") || "";
    if (
      !Number.isFinite(orderId) ||
      !Number.isFinite(foodId) ||
      !Number.isFinite(chefId)
    )
      return;
    openReviewsForDish({
      mode: "write",
      order_id: orderId,
      food_id: foodId,
      chef_id: chefId,
      title,
      chef_name: chefName,
    });
    return;
  }
  const reportBtn = e.target.closest("[data-report-order-id]");
  if (reportBtn) {
    e.preventDefault();
    if (!DBPROFILE?.user_id) {
      alert(
        "You need to finish setting up your profile before reporting an order.",
      );
      onboardModal?.show();
      return;
    }
    const orderId = Number(reportBtn.getAttribute("data-report-order-id"));
    const chefId = Number(reportBtn.getAttribute("data-report-chef-id"));
    let foodId = Number(reportBtn.getAttribute("data-report-food-id"));
    if (!Number.isFinite(orderId) || !Number.isFinite(chefId)) return;
    if (!Number.isFinite(foodId)) {
      const { data: ord, error: ordErr } = await db
        .from("orders")
        .select("food_id")
        .eq("order_id", orderId)
        .maybeSingle();
      if (!ordErr) foodId = Number(ord?.food_id);
    }
    if (!Number.isFinite(foodId)) {
      alert("Could not determine which dish this report is for.");
      return;
    }
    if (await hasReportedOrder(orderId)) {
      alert(
        "You have already reported this order. You can only report an order once.",
      );
      await loadOrdersAndDashboard();
      return;
    }
    if (await hasReportedFood(foodId)) {
      alert(
        "You have already reported this listing. You can only report a listing once.",
      );
      await loadOrdersAndDashboard();
      return;
    }
    REPORT_CTX = { order_id: orderId, chef_id: chefId, food_id: foodId };
    if (reportReason) reportReason.value = "";
    if (reportMsg) {
      reportMsg.className = "small";
      reportMsg.textContent = "";
    }
    reportModal?.show();
    return;
  }
  const favBtn = e.target.closest("[data-fav-food]");
  if (!favBtn) return;
  e.preventDefault();
  const foodId = Number(favBtn.getAttribute("data-fav-food"));
  if (!Number.isFinite(foodId)) return;
  favBtn.disabled = true;
  const res = await toggleFavFood(foodId);
  favBtn.disabled = false;
  if (!res.ok) return;
  syncFavButtons(foodId);
  if (favsModalEl?.classList.contains("show")) renderFavsModal();
});

editListingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!EDIT_LISTING_CTX) return;
  clearFormInvalid(editListingForm);
  const titleR = V.text(edTitle, "Title", {
    required: true,
    min: 3,
    max: 120,
    pattern: TEXT_ONLY.titleCatPattern,
  });
  if (!titleR.ok) setInvalid(edTitle, titleR.msg);
  const descR = V.text(edDesc, "Description", {
    required: true,
    min: 10,
    max: 600,
    pattern: TEXT_ONLY.descPattern,
  });
  if (!descR.ok) setInvalid(edDesc, descR.msg);
  const catR = V.text(edCat, "Category", {
    required: true,
    min: 2,
    max: 60,
    pattern: TEXT_ONLY.titleCatPattern,
  });
  if (!catR.ok) setInvalid(edCat, catR.msg);
  const priceR = V.number(edPrice, "Price (£)", {
    required: true,
    min: 0,
    max: 9999,
  });
  if (!priceR.ok) setInvalid(edPrice, priceR.msg);
  const portionsR = V.int(edPortions, "Portions available", {
    required: true,
    min: 0,
    max: 999,
  });
  if (!portionsR.ok) setInvalid(edPortions, portionsR.msg);
  const rateR = V.number(edDeliveryRate, "Delivery £/mile", {
    required: !!edDelivery?.checked,
    min: 0.01,
    max: 100,
  });
  if (!rateR.ok && !!edDelivery?.checked) setInvalid(edDeliveryRate, rateR.msg);
  const imgR = V.url(edImg, "Image URL", { required: false });
  if (!imgR.ok) setInvalid(edImg, imgR.msg);
  if (editListingForm.querySelector(".is-invalid")) {
    setMsg(
      editListingMsg,
      "danger",
      "Fix the highlighted fields and try again.",
    );
    focusFirstInvalid(editListingForm);
    return;
  }
  try {
    let imageUrl = imgR.value || EDIT_LISTING_CTX.image_url || "";
    if (edFile?.files?.[0])
      imageUrl =
        (await uploadSelectedFile(edFile.files[0], "listing-edit")) || imageUrl;
    const allergens = selectedAllergensFromWrap(
      edAllergensWrap,
      edAllergensNone,
    );
    const payload = {
      title: titleR.value,
      description: descR.value,
      category: catR.value,
      price: priceR.value,
      portions_available: portionsR.value,
      allergens_disclosure: allergens.includes("n/a")
        ? "n/a"
        : allergens.join(", "),
      image_url: imageUrl || null,
      pickup_available: !!edPickup?.checked,
      delivery_available: !!edDelivery?.checked,
      delivery_rate_per_mile: !!edDelivery?.checked ? rateR.value : null,
      is_vegan: !!edVegan?.checked,
      ingredients: String(edIngredients?.value || "").trim() || null,
      prep_date: String(edPrepDate?.value || "").trim() || null,
      status_note: String(edStatusNote?.value || "").trim() || null,
    };
    if (edExpiryDays?.value)
      payload.expires_at = new Date(
        Date.now() + Number(edExpiryDays.value) * 24 * 60 * 60 * 1000,
      ).toISOString();
    const { error } = await updateFoodRowWithFallback(edFoodId?.value, payload);

    if (error) {
      console.error("edit listing update error", error);
      setMsg(
        editListingMsg,
        "danger",
        error.message || "Could not update listing.",
      );
      return;
    }
    await loadDishes();
    await loadOrdersAndDashboard();
    setTimeout(() => editListingModal?.hide(), 500);
  } catch (e2) {
    setMsg(editListingMsg, "danger", e2.message || "Could not update listing.");
  }
});
btnDuplicateListing?.addEventListener("click", async () => {
  if (!EDIT_LISTING_CTX) return;
  try {
    const clone = { ...EDIT_LISTING_CTX };
    delete clone.food_id;
    delete clone.created_at;
    clone.title = `${clone.title} (copy)`;
    clone.is_archived = false;
    clone.portions_available = Math.max(
      1,
      Number(clone.portions_available || clone.portions || 1),
    );
    const { error } = await db.from("food").insert(clone);
    if (error) throw error;
    pushNotification("Listing duplicated", clone.title, "info");
    await loadDishes();
    await loadOrdersAndDashboard();
    editListingModal?.hide();
  } catch (e) {
    setMsg(
      editListingMsg,
      "danger",
      e.message || "Could not duplicate listing.",
    );
  }
});
btnArchiveListing?.addEventListener("click", async () => {
  if (!EDIT_LISTING_CTX) return;
  try {
    const { error } = await db
      .from("food")
      .update({ is_archived: true })
      .eq("food_id", Number(EDIT_LISTING_CTX.food_id));
    if (error) throw error;
    pushNotification("Listing archived", EDIT_LISTING_CTX.title, "info", {
      food_id: EDIT_LISTING_CTX.food_id,
    });
    await loadDishes();
    await loadOrdersAndDashboard();
    editListingModal?.hide();
  } catch (e) {
    setMsg(editListingMsg, "danger", e.message || "Could not archive listing.");
  }
});
btnSoldOutListing?.addEventListener("click", async () => {
  if (!EDIT_LISTING_CTX) return;
  try {
    const { error } = await db
      .from("food")
      .update({ portions_available: 0 })
      .eq("food_id", Number(EDIT_LISTING_CTX.food_id));
    if (error) throw error;
    pushNotification(
      "Listing marked sold out",
      EDIT_LISTING_CTX.title,
      "info",
      { food_id: EDIT_LISTING_CTX.food_id },
    );
    await loadDishes();
    await loadOrdersAndDashboard();
    editListingModal?.hide();
  } catch (e) {
    setMsg(editListingMsg, "danger", e.message || "Could not update listing.");
  }
});

// ---------- Boot ----------
function initFieldRestrictions() {
  enforceTextOnlyInput(upTitle, TEXT_ONLY.titleCatInvalidChars);
  enforceTextOnlyInput(upCat, TEXT_ONLY.titleCatInvalidChars);
  enforceTextOnlyInput(upDesc, TEXT_ONLY.descInvalidChars);
  enforceTextOnlyInput(edTitle, TEXT_ONLY.titleCatInvalidChars);
  enforceTextOnlyInput(edCat, TEXT_ONLY.titleCatInvalidChars);
  enforceTextOnlyInput(edDesc, TEXT_ONLY.descInvalidChars);
  enforceTextOnlyInput(fldDbName, TEXT_ONLY.usernameInvalidChars);
  enforceTextOnlyInput(onbName, TEXT_ONLY.usernameInvalidChars);
  [
    loginForm,
    signupForm,
    uploadForm,
    editListingForm,
    orderForm,
    reportForm,
    reviewForm,
    document.getElementById("editProfileForm"),
    document.getElementById("accessForm"),
  ].forEach(wireLiveValidation);
}
initFieldRestrictions();

function syncAuthTabsA11y() {
  const tabButtons = Array.from(
    document.querySelectorAll('#mobileAuth [data-bs-toggle="tab"]'),
  );

  if (!tabButtons.length) return;

  tabButtons.forEach((tabBtn) => {
    const targetSelector = tabBtn.getAttribute("data-bs-target");
    const panel = targetSelector
      ? document.querySelector(targetSelector)
      : null;

    const isActive = tabBtn.classList.contains("active");

    tabBtn.setAttribute("role", "tab");
    tabBtn.setAttribute("aria-selected", isActive ? "true" : "false");
    tabBtn.setAttribute("tabindex", isActive ? "0" : "-1");

    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabBtn.id || "");
      panel.hidden = !isActive;
    }
  });
}

document.querySelectorAll('[data-bs-toggle="tab"]').forEach((tabBtn) => {
  tabBtn.addEventListener("shown.bs.tab", () => {
    syncAuthTabsA11y();
    const label = tabBtn.textContent?.trim();
    if (label) announce(`${label} tab opened.`, "polite");
  });
});

syncAuthTabsA11y();

async function bootProtectedPage(sessionUser) {
  const u = sessionUser;
  if (!u) {
    clearFavsState();
    LAST_AUTH_UID = null;
    if (PROTECTED_PAGES.has(PAGE)) go("login", true);
    return;
  }
  if (LAST_AUTH_UID !== u.id) {
    LAST_AUTH_UID = u.id;
    clearFavsState();
  }
  if (authEmailEl) authEmailEl.textContent = u.email || "";
  const { data: prof } = await getDbProfile(u.id);
  useDbProfileUI(prof || null);
  if (DBPROFILE?.user_id) loadReportedFoods(DBPROFILE.user_id);
  else resetReportedFoods();
  if (fldDbName)
    fldDbName.value = DBPROFILE?.user_name || u.email?.split("@")[0] || "";
  if (fldRole) fldRole.value = DBPROFILE?.user_group || "user";
  if (
    !(await hasBaseProfile(u.id)) &&
    getOnbSeenUid() !== u.id &&
    onboardModal
  ) {
    if (onbName) onbName.value = u.email?.split("@")[0] || "";
    if (onbRole) onbRole.value = "user";
    onboardModal.show();
    setOnbSeenUid(u.id);
  }
  if (PAGE === "listings") {
    setLocationsView(LOC_VIEW);
    await loadDishes();
  }
  if (PAGE === "dashboard") {
    await loadDishes();
    await loadOrdersAndDashboard();
  }
  if (PAGE === "profile") {
    renderNotifications();
    markNotificationsRead();
  }
}

async function boot() {
  dbg("boot start", { page: PAGE });
  const { data, error } = await supabase.auth.getSession();
  if (error) warn("getSession error", error);
  const sessionUser = data?.session?.user || null;

  if (PAGE === "index") {
    const handleViewportRedirect = () => {
      if (!isDesktopViewport()) {
        go(sessionUser ? "listings" : "login", true);
      }
    };

    // Run immediately
    handleViewportRedirect();

    // Also react when the viewport changes after the page has already loaded
    const mq = window.matchMedia("(min-width: 992px)");
    const onViewportChange = () => handleViewportRedirect();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onViewportChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onViewportChange);
    }

    return;
  }

  if (PAGE === "login") {
    if (sessionUser) go("listings", true);
    else focusPageStart();
    return;
  }

  await bootProtectedPage(sessionUser);
  focusPageStart();
}

supabase.auth.onAuthStateChange((event, session) => {
  dbg("auth.onAuthStateChange", { event, hasSession: !!session, page: PAGE });
  if (event === "SIGNED_OUT") {
    announce("Signed out.", "polite");
    clearFavsState();
    LAST_AUTH_UID = null;
    if (PROTECTED_PAGES.has(PAGE)) go("login", true);
  }
  if (event === "SIGNED_IN" && PAGE === "login") {
    announce("Signed in successfully. Opening listings.", "polite");
    go("listings", true);
  }
});

boot();
