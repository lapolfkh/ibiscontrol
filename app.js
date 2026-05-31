/* app.js
   Hinweise:
   - Ersetze SUPABASE_URL und SUPABASE_ANON_KEY mit deinen Supabase-Projektwerten.
   - In Supabase sollten folgende Tabellen angelegt werden (SQL-Beispiele im Kommentar).
   - Dieses Skript nutzt Supabase Realtime (v2 channel postgres_changes) für Live-Synchronisation.
*/

/* =========================
   Konfiguration (ersetzen)
   ========================= */
const SUPABASE_URL = "https://REPLACE_WITH_YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_ANON_KEY";

/* =========================
   Feste Login-Daten (wie gewünscht)
   ========================= */
const CREDENTIALS = {
  ausbilder: { user: "AusbildungPolFKH", pass: "PolizeiFKH" },
  kommission: { user: "PruefungKomFKH", pass: "PolizeiFKH" }
};

/* =========================
   Supabase initialisieren
   ========================= */
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   DOM-Elemente
   ========================= */
const panels = {
  azubi: document.getElementById("panel-azubi"),
  ausbilder: document.getElementById("panel-ausbilder"),
  kommission: document.getElementById("panel-kommission")
};
const navBtns = {
  azubi: document.getElementById("view-azubi"),
  ausbilder: document.getElementById("view-ausbilder"),
  kommission: document.getElementById("view-kommission")
};

/* Azubi elements */
const linksList = document.getElementById("links-list");
const eventsList = document.getElementById("events-list");
const examStatus = document.getElementById("exam-status");
const examControls = document.getElementById("exam-controls");
const examFormLink = document.getElementById("exam-form-link");
const examTimer = document.getElementById("exam-timer");

/* Ausbilder elements */
const ausLoginCard = document.getElementById("ausbilder-login");
const ausPanel = document.getElementById("ausbilder-panel");
const ausUser = document.getElementById("ausbilder-user");
const ausPass = document.getElementById("ausbilder-pass");
const ausLoginBtn = document.getElementById("ausbilder-login-btn");
const ausLoginMsg = document.getElementById("ausbilder-login-msg");
const eventForm = document.getElementById("event-form");
const eventsAdminList = document.getElementById("events-admin-list");
const linkForm = document.getElementById("link-form");
const linkModule = document.getElementById("link-module");
const linkUrl = document.getElementById("link-url");

/* Kommission elements */
const komLoginCard = document.getElementById("kommission-login");
const komPanel = document.getElementById("kommission-panel");
const komUser = document.getElementById("kommission-user");
const komPass = document.getElementById("kommission-pass");
const komLoginBtn = document.getElementById("kommission-login-btn");
const komLoginMsg = document.getElementById("kommission-login-msg");
const activateExamBtn = document.getElementById("activate-exam");
const deactivateExamBtn = document.getElementById("deactivate-exam");
const examLog = document.getElementById("exam-log");
const eventFormKom = document.getElementById("event-form-kom");
const eventsAdminListKom = document.getElementById("events-admin-list-kom");

/* =========================
   Navigation
   ========================= */
function showPanel(name) {
  Object.keys(panels).forEach(k => {
    panels[k].classList.toggle("hidden", k !== name);
    navBtns[k].classList.toggle("active", k === name);
    navBtns[k].setAttribute("aria-pressed", k === name ? "true" : "false");
  });
}
navBtns.azubi.addEventListener("click", () => showPanel("azubi"));
navBtns.ausbilder.addEventListener("click", () => showPanel("ausbilder"));
navBtns.kommission.addEventListener("click", () => showPanel("kommission"));

/* =========================
   Hilfsfunktionen
   ========================= */
function formatDateTime(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

function showMsg(el, text, isError = true) {
  el.textContent = text;
  el.style.color = isError ? "var(--danger)" : "var(--success)";
  setTimeout(() => (el.textContent = ""), 5000);
}

/* =========================
   Default-Links
   ========================= */
const DEFAULT_LINKS = {
  modul1: "https://docs.google.com/presentation/d/1dsLpxzoutCNwveCpcIGXBNMMvw4i_kjtF1UUoiXFde4/edit",
  modul2: "https://docs.google.com/presentation/d/1wXW27UhpQbMxghyLg99FGA2hXXLnBFjdLs0CgIEBYRk/edit",
  modul3: "https://docs.google.com/presentation/d/1TTWdR5CDGtZQ_MtDE6cFEAwMxsa1_cr4vkiixid9SQY/edit",
  pruefungsform: "https://docs.google.com/forms/d/e/1FAIpQLSevtU3kABQmHy8YjPqyP0sXwH2UV9YruMKOQH3BKu37J_1xuQ/viewform"
};

async function ensureDefaultLinks() {
  for (const [key, url] of Object.entries(DEFAULT_LINKS)) {
    const { data } = await supabase.from("links").select().eq("key", key).limit(1);
    if (!data || data.length === 0) {
      await supabase.from("links").insert({ key, url });
    }
  }
}

/* =========================
   Realtime abonnieren
   ========================= */
async function subscribeRealtime() {
  await supabase.channel("public:events")
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
      loadEvents();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, payload => {
      loadLinks();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, payload => {
      loadExam();
    })
    .subscribe();
}

/* =========================
   Laden & Rendern
   ========================= */
async function loadLinks() {
  const { data, error } = await supabase.from("links").select("*");
  if (error) {
    console.error("links load error", error);
    return;
  }
  linksList.innerHTML = "";
  const map = {};
  data.forEach(r => (map[r.key] = r.url));
  const items = [
    { key: "modul1", label: "Modul 1 — Grundwissen" },
    { key: "modul2", label: "Modul 2 — Täglicher Dienst" },
    { key: "modul3", label: "Modul 3 — Rechtslehre" },
    { key: "pruefungsform", label: "Prüfungsform (Formular)" }
  ];
  items.forEach(it => {
    const url = map[it.key] || DEFAULT_LINKS[it.key] || "#";
    const li = document.createElement("li");
    li.innerHTML = `<span>${it.label}</span><a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    linksList.appendChild(li);
  });

  if (linkModule && linkUrl) {
    const sel = linkModule.value;
    const current = map[sel] || "";
    linkUrl.value = current;
  }

  const examLink = map["pruefungsform"] || DEFAULT_LINKS["pruefungsform"];
  examFormLink.href = examLink;
}

async function loadEvents() {
  const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
  if (error) {
    console.error("events load error", error);
    return;
  }
  eventsList.innerHTML = "";
  data.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `<div>
                      <strong>${ev.title}</strong>
                      <div class="meta">${formatDateTime(ev.starts_at)} ${ev.location ? "• " + ev.location : ""}</div>
                    </div>
                    <div class="meta"></div>`;
    eventsList.appendChild(li);
  });

  function renderAdminList(container, list) {
    container.innerHTML = "";
    list.forEach(ev => {
      const li = document.createElement("li");
      li.innerHTML = `<div>
                        <strong>${ev.title}</strong>
                        <div class="meta">${formatDateTime(ev.starts_at)} ${ev.location ? "• " + ev.location : ""}</div>
                      </div>
                      <div>
                        <button class="btn" data-id="${ev.id}" data-action="delete">Löschen</button>
                      </div>`;
      container.appendChild(li);
    });
    container.querySelectorAll("button[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await supabase.from("events").delete().eq("id", id);
      });
    });
  }

  renderAdminList(eventsAdminList, data);
  renderAdminList(eventsAdminListKom, data);
}

let examTimerInterval = null;
let currentExam = null;

function startExamCountdown(expiresAt) {
  clearInterval(examTimerInterval);
  function update() {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    if (diff <= 0) {
      examTimer.textContent = "Abgelaufen";
      examControls.classList.add("hidden");
      examStatus.textContent = "Keine Prüfung aktiv";
      clearInterval(examTimerInterval);
      return;
    }
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    examTimer.textContent = `${minutes}m ${seconds}s verbleibend`;
  }
  update();
  examTimerInterval = setInterval(update, 1000);
}

async function loadExam() {
  const { data, error } = await supabase.from("exams").select("*").limit(1).order("inserted_at", { ascending: false });
  if (error) {
    console.error("exam load error", error);
    return;
  }
  const exam = data && data[0];
  currentExam = exam || null;
  if (exam && exam.active && exam.expires_at) {
    examStatus.textContent = "Prüfung aktiv";
    examControls.classList.remove("hidden");
    examFormLink.href = examFormLink.href || DEFAULT_LINKS.pruefungsform;
    startExamCountdown(exam.expires_at);
    deactivateExamBtn.disabled = false;
  } else {
    examStatus.textContent = "Keine Prüfung aktiv";
    examControls.classList.add("hidden");
    examTimer.textContent = "";
    deactivateExamBtn.disabled = true;
    clearInterval(examTimerInterval);
  }
}

/* =========================
   Aktionen: Events & Links
   ========================= */
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("event-title").value.trim();
  const starts_at = document.getElementById("event-date").value;
  const location = document.getElementById("event-location").value.trim();
  if (!title || !starts_at) return;
  await supabase.from("events").insert({ title, starts_at, location, created_by: "Ausbilder" });
  eventForm.reset();
});

eventFormKom.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("event-title-kom").value.trim();
  const starts_at = document.getElementById("event-date-kom").value;
  const location = document.getElementById("event-location-kom").value.trim();
  if (!title || !starts_at) return;
  await supabase.from("events").insert({ title, starts_at, location, created_by: "Kommission" });
  eventFormKom.reset();
});

linkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = linkModule.value;
  const url = linkUrl.value.trim();
  if (!url) return;
  await supabase.from("links").upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: "key" });
  showMsg(ausLoginMsg, "Link gespeichert", false);
});

/* =========================
   Prüfungsfreischaltung (Kommission)
   ========================= */
activateExamBtn.addEventListener("click", async () => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await supabase.from("exams").insert({
    key: "active_exam",
    active: true,
    expires_at: expiresAt,
    activated_by: "Kommission"
  });
  await supabase.from("exams").update({ active: true, expires_at: expiresAt, activated_by: "Kommission" }).eq("key", "active_exam");
  examLog.textContent = `Prüfung freigeschaltet bis ${formatDateTime(expiresAt)}.`;
});

deactivateExamBtn.addEventListener("click", async () => {
  await supabase.from("exams").update({ active: false, expires_at: null }).eq("key", "active_exam");
  examLog.textContent = `Prüfung manuell beendet.`;
});

/* Hintergrund-Task: Deaktivieren nach Ablauf */
setInterval(async () => {
  const { data } = await supabase.from("exams").select("*").eq("key", "active_exam").limit(1);
  if (data && data[0] && data[0].active && data[0].expires_at) {
    const expires = new Date(data[0].expires_at);
    if (new Date() > expires) {
      await supabase.from("exams").update({ active: false, expires_at: null }).eq("key", "active_exam");
    }
  }
}, 5000);

/* =========================
   Login-Handling (Client-seitig, feste Daten)
   ========================= */
function setLoggedIn(role) {
  if (role === "ausbilder") {
    ausLoginCard.classList.add("hidden");
    ausPanel.classList.remove("hidden");
    ausPanel.setAttribute("aria-hidden", "false");
  } else if (role === "kommission") {
    komLoginCard.classList.add("hidden");
    komPanel.classList.remove("hidden");
    komPanel.setAttribute("aria-hidden", "false");
  }
  localStorage.setItem("role", role);
}

function checkSession() {
  const role = localStorage.getItem("role");
  if (role === "ausbilder") setLoggedIn("ausbilder");
  if (role === "kommission") setLoggedIn("kommission");
}
checkSession();

ausLoginBtn.addEventListener("click", () => {
  const u = ausUser.value.trim();
  const p = ausPass.value;
  if (u === CREDENTIALS.ausbilder.user && p === CREDENTIALS.ausbilder.pass) {
    setLoggedIn("ausbilder");
    showMsg(ausLoginMsg, "Erfolgreich angemeldet", false);
  } else {
    showMsg(ausLoginMsg, "Ungültige Zugangsdaten");
  }
});

komLoginBtn.addEventListener("click", () => {
  const u = komUser.value.trim();
  const p = komPass.value;
  if (u === CREDENTIALS.kommission.user && p === CREDENTIALS.kommission.pass) {
    setLoggedIn("kommission");
    showMsg(komLoginMsg, "Erfolgreich angemeldet", false);
  } else {
    showMsg(komLoginMsg, "Ungültige Zugangsdaten");
  }
});

/* =========================
   Initial load
   ========================= */
(async function init() {
  if (SUPABASE_URL.includes("REPLACE") || SUPABASE_ANON_KEY.includes("REPLACE")) {
    console.warn("Bitte SUPABASE_URL und SUPABASE_ANON_KEY in app.js ersetzen.");
  }
  await ensureDefaultLinks();
  await loadLinks();
  await loadEvents();
  await loadExam();
  await subscribeRealtime();

  linkModule.addEventListener("change", async () => {
    const key = linkModule.value;
    const { data } = await supabase.from("links").select("url").eq("key", key).limit(1);
    linkUrl.value = (data && data[0] && data[0].url) || DEFAULT_LINKS[key] || "";
  });

  setInterval(() => {
    loadLinks();
    loadEvents();
    loadExam();
  }, 30_000);
})();
