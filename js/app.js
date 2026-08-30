/* ==========================================================================
   NAGRIK SETU — shared app logic (localStorage-backed, no backend)
   Keys: gp_users, gp_complaints, gp_session, gp_seeded, gp_counter
   ========================================================================== */

const CATEGORIES = [
  { id: "refund",    label: "Consumer Grievance & Refunds" },
  { id: "road",      label: "Public Infrastructure & Road Repair" },
  { id: "utility",   label: "Electricity & Utility Issues" },
  { id: "water",     label: "Municipal Water Supply" },
  { id: "upi",       label: "Digital Payment & Banking" },
  { id: "cyber",     label: "Cyber Crime & Digital Fraud" },
  { id: "scheme",    label: "Scheme & Benefit Discovery" },
  { id: "health",    label: "Public Health & Hospital Guidance" },
  { id: "education", label: "Student & Education Guidance" },
  { id: "other",     label: "Other Public Service Grievance" },
];

const STATUS = ["Pending", "In Progress", "Resolved"];

/* ---------------- low level storage ---------------- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function getUsers() { return readJSON("gp_users", []); }
function saveUsers(u) { writeJSON("gp_users", u); }
function getComplaints() { return readJSON("gp_complaints", []); }
function saveComplaints(c) { writeJSON("gp_complaints", c); }
function getSession() { return readJSON("gp_session", null); }
function setSession(s) { writeJSON("gp_session", s); }
function clearSession() { localStorage.removeItem("gp_session"); }

function nextTokenId() {
  let n = parseInt(localStorage.getItem("gp_counter") || "1040", 10) + 1;
  localStorage.setItem("gp_counter", String(n));
  return "G-" + n;
}

/* ---------------- seed demo data (first run only) ---------------- */
function seedIfNeeded() {
  if (localStorage.getItem("gp_seeded")) return;

  const users = [
    { id: "u-admin", name: "Grievance Officer", email: "admin@setu.gov.in", password: "admin123", role: "admin" },
    { id: "u-1", name: "Ritika Sharma", email: "demo@citizen.in", password: "demo123", role: "citizen" },
    { id: "u-2", name: "Aman Verma", email: "aman@citizen.in", password: "demo123", role: "citizen" },
  ];
  saveUsers(users);

  const now = Date.now();
  const day = 86400000;
  const complaints = [
    { id: "G-1032", userId: "u-1", userName: "Ritika Sharma", category: "refund", title: "Refund not credited for cancelled order", description: "Cancelled an online order 12 days ago on Flipmart; refund of ₹2,450 was promised in 5-7 days but hasn't arrived.", location: "Sector 62, Noida", date: now - 12*day, status: "In Progress", priority: "Medium" },
    { id: "G-1029", userId: "u-1", userName: "Ritika Sharma", category: "road", title: "Deep pothole near market causing accidents", description: "A large pothole has formed near the vegetable market entrance and two-wheelers keep skidding, especially at night.", location: "Alpha 1 Market Road", date: now - 20*day, status: "Resolved", priority: "High" },
    { id: "G-1041", userId: "u-2", userName: "Aman Verma", category: "utility", title: "Electricity bill shows usage from vacant flat", description: "Meter reading for last month is nearly 3x normal, but the flat was locked and unoccupied the whole month.", location: "Gamma 2, Greater Noida", date: now - 4*day, status: "Pending", priority: "Medium" },
    { id: "G-1038", userId: "u-2", userName: "Aman Verma", category: "upi", title: "UPI debited but merchant did not receive payment", description: "₹1,200 was debited from my account for a payment at a fuel station, but the merchant's machine showed failed.", location: "NH-24 Fuel Station", date: now - 7*day, status: "In Progress", priority: "High" },
    { id: "G-1025", userId: "u-1", userName: "Ritika Sharma", category: "other", title: "Streetlights not functioning for two weeks", description: "An entire stretch of street lighting on the park road has been non-functional, raising safety concerns after dark.", location: "Beta 2 Park Road", date: now - 25*day, status: "Resolved", priority: "Low" },
    { id: "G-1044", userId: "u-2", userName: "Aman Verma", category: "road", title: "Water-logged road after routine rain", description: "Even light rain causes ankle-deep waterlogging near the underpass due to blocked drainage.", location: "Underpass, Sector 51", date: now - 2*day, status: "Pending", priority: "High" },
    { id: "G-1045", userId: "u-1", userName: "Ritika Sharma", category: "water", title: "No piped water supply for three days", description: "The entire block has had no municipal water supply since Monday; tanker deliveries have also stopped.", location: "Sector 62, Noida", date: now - 3*day, status: "Resolved", priority: "High" },
    { id: "G-1046", userId: "u-2", userName: "Aman Verma", category: "cyber", title: "Phishing SMS asking for bank OTP", description: "Received a message impersonating my bank asking to share OTP to 'reactivate' my account; reported before sharing anything.", location: "Online", date: now - 1*day, status: "Pending", priority: "High" },
    { id: "G-1047", userId: "u-1", userName: "Ritika Sharma", category: "scheme", title: "Unclear eligibility criteria for scholarship scheme", description: "Unable to find clear eligibility rules for a state scholarship scheme; the department portal gives no clarification.", location: "Greater Noida", date: now - 9*day, status: "In Progress", priority: "Low" },
    { id: "G-1048", userId: "u-2", userName: "Aman Verma", category: "health", title: "Long OPD wait times at government hospital", description: "Patients routinely wait 4-5 hours for a basic OPD consultation due to too few counters being staffed.", location: "District Hospital, Noida", date: now - 15*day, status: "Pending", priority: "Medium" },
    { id: "G-1049", userId: "u-1", userName: "Ritika Sharma", category: "education", title: "College delaying transfer certificate issue", description: "College administration has delayed issuing a transfer certificate for over a month with no clear reason given.", location: "Sector 62, Noida", date: now - 6*day, status: "Resolved", priority: "Medium" },
  ];
  saveComplaints(complaints);
  localStorage.setItem("gp_counter", "1049");
  localStorage.setItem("gp_seeded", "1");
}

/* ---------------- auth ---------------- */
function registerCitizen({ name, email, password }) {
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, message: "An account with this email already exists." };
  }
  const user = { id: "u-" + Date.now(), name, email, password, role: "citizen" };
  users.push(user);
  saveUsers(users);
  setSession({ userId: user.id, role: "citizen" });
  return { ok: true, user };
}

function login({ email, password, role }) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
  if (!user) return { ok: false, message: "No matching " + role + " account found for those credentials." };
  setSession({ userId: user.id, role: user.role });
  return { ok: true, user };
}

function currentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) || null;
}

function requireRole(role) {
  const s = getSession();
  if (!s || s.role !== role) {
    window.location.href = "login.html";
    return null;
  }
  return currentUser();
}

function logout() { clearSession(); window.location.href = "index.html"; }

/* ---------------- complaints ---------------- */
function fileComplaint({ userId, userName, category, title, description, location, priority }) {
  const complaints = getComplaints();
  const record = {
    id: nextTokenId(), userId, userName, category, title, description,
    location, date: Date.now(), status: "Pending", priority: priority || "Medium",
  };
  complaints.unshift(record);
  saveComplaints(complaints);
  return record;
}

function complaintsForUser(userId) {
  return getComplaints().filter(c => c.userId === userId).sort((a, b) => b.date - a.date);
}

function updateStatus(id, status) {
  const complaints = getComplaints();
  const rec = complaints.find(c => c.id === id);
  if (rec) { rec.status = status; saveComplaints(complaints); }
}

function categoryLabel(id) {
  const c = CATEGORIES.find(c => c.id === id);
  return c ? c.label : id;
}

function statusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "In Progress") return "progress";
  return "resolved";
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* run seed on every page load */
seedIfNeeded();
