'use strict';

const $a = id => document.getElementById(id);

let allApplications = [];
let currentFilter   = 'all';
let unsubscribeApps = null;

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  onAuthChange(user => {
    if (user) {
      showDashboard();
      startListening();
    } else {
      showLogin();
    }
  });

  $a('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  $a('modal-overlay').addEventListener('click', e => {
    if (e.target === $a('modal-overlay')) closeModal();
  });
});

// ── Auth ──────────────────────────────────────────────────
function showLogin() {
  $a('login-screen').style.display = 'flex';
  $a('dashboard').style.display    = 'none';
  if (unsubscribeApps) { unsubscribeApps(); unsubscribeApps = null; }
}

function showDashboard() {
  $a('login-screen').style.display = 'none';
  $a('dashboard').style.display    = 'block';
}

async function doLogin() {
  const email    = $a('adminEmail').value.trim();
  const password = $a('adminPassword').value;
  const btn      = $a('login-btn');
  const alertEl  = $a('login-alert');

  if (!email || !password) {
    alertEl.textContent    = 'Please enter your email and password.';
    alertEl.style.display  = 'block';
    return;
  }

  btn.disabled        = true;
  btn.textContent     = 'Signing in…';
  alertEl.style.display = 'none';

  try {
    await adminLogin(email, password);
  } catch {
    alertEl.textContent   = 'Invalid email or password.';
    alertEl.style.display = 'block';
    btn.disabled          = false;
    btn.textContent       = 'Sign In';
  }
}

async function doLogout() {
  await adminLogout();
}

// ── Data ──────────────────────────────────────────────────
function startListening() {
  unsubscribeApps = getAllApplications(apps => {
    allApplications = apps;
    updateCounts();
    renderTable();
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTable();
}

function updateCounts() {
  $a('count-all').textContent      = allApplications.length;
  $a('count-pending').textContent  = allApplications.filter(a => a.status === 'pending').length;
  $a('count-approved').textContent = allApplications.filter(a => a.status === 'approved').length;
  $a('count-rejected').textContent = allApplications.filter(a => a.status === 'rejected').length;
}

function renderTable() {
  const list = currentFilter === 'all'
    ? allApplications
    : allApplications.filter(a => a.status === currentFilter);

  const tbody = $a('applications-body');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(app => {
    const date = app.submittedAt
      ? new Date(app.submittedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    return `
      <tr>
        <td class="td-name">${esc(app.firstName)} ${esc(app.lastName)}</td>
        <td>${esc(app.email)}</td>
        <td>${esc((app.phoneCode || '') + ' ' + (app.phone || ''))}</td>
        <td>${date}</td>
        <td><span class="badge badge-${app.status}">${app.status}</span></td>
        <td><button class="btn-view" onclick="openModal('${app.id}')">View</button></td>
      </tr>`;
  }).join('');
}

// ── Modal ─────────────────────────────────────────────────
function openModal(id) {
  const app = allApplications.find(a => a.id === id);
  if (!app) return;

  const date = app.submittedAt
    ? new Date(app.submittedAt.seconds * 1000).toLocaleString()
    : '—';

  const docLinks = [
    app.frontUrl
      ? `<a href="${app.frontUrl}" target="_blank" class="doc-link">&#128196; Front of ID</a>` : '',
    app.backUrl && app.backUrl !== 'n/a'
      ? `<a href="${app.backUrl}" target="_blank" class="doc-link">&#128196; Back of ID</a>` : '',
    app.selfieUrl
      ? `<a href="${app.selfieUrl}" target="_blank" class="doc-link">&#129315; Selfie with ID</a>` : '',
  ].filter(Boolean).join('');

  $a('modal-content').innerHTML = `
    <div class="modal-header">
      <div>
        <h2>${esc(app.firstName)} ${esc(app.lastName)}</h2>
        <p class="modal-sub">${esc(app.email)}</p>
      </div>
      <span class="badge badge-${app.status}">${app.status}</span>
    </div>

    <div class="info-grid">
      <div class="info-item"><span class="info-key">Phone</span><span>${esc((app.phoneCode || '') + ' ' + (app.phone || ''))}</span></div>
      <div class="info-item"><span class="info-key">Date of Birth</span><span>${esc(app.dob || '—')}</span></div>
      <div class="info-item"><span class="info-key">Gender</span><span>${esc(app.gender || '—')}</span></div>
      <div class="info-item"><span class="info-key">Username</span><span>${esc(app.username || '—')}</span></div>
      <div class="info-item"><span class="info-key">Social Handle</span><span>${esc(app.social || '—')}</span></div>
      <div class="info-item"><span class="info-key">POF Account</span><span>${app.hasPofAccount ? 'Yes' : 'No'}</span></div>
      <div class="info-item"><span class="info-key">ID Type</span><span>${esc(app.idType || '—')}</span></div>
      <div class="info-item"><span class="info-key">Submitted</span><span>${date}</span></div>
    </div>

    ${docLinks ? `<div class="doc-section"><h3>Documents</h3><div class="doc-links">${docLinks}</div></div>` : ''}

    <div class="username-edit-section">
      <h3>Update Username</h3>
      <p class="username-edit-hint">If you change the username, the applicant will see the updated username on their screen immediately.</p>
      <div class="username-edit-row">
        <input type="text" id="modal-username-input" class="username-input" value="${esc(app.username || '')}" placeholder="Enter new username" />
        <button class="btn-save-username" id="btn-save-username" onclick="saveUsername('${app.id}')">Save</button>
      </div>
      <p class="username-save-msg" id="username-save-msg"></p>
    </div>

    <div class="modal-actions">
      <button class="btn-approve" onclick="setStatus('${app.id}', 'approved')" ${app.status === 'approved' ? 'disabled' : ''}>&#10003; Approve</button>
      <button class="btn-reject"  onclick="setStatus('${app.id}', 'rejected')" ${app.status === 'rejected' ? 'disabled' : ''}>&#10007; Reject</button>
    </div>
  `;

  $a('modal-overlay').style.display = 'flex';
}

function closeModal() {
  $a('modal-overlay').style.display = 'none';
}

async function setStatus(id, status) {
  try {
    await updateStatus(id, status);
    closeModal();
  } catch (err) {
    console.error('Status update failed:', err);
  }
}

async function saveUsername(docId) {
  const input  = $a('modal-username-input');
  const btn    = $a('btn-save-username');
  const msgEl  = $a('username-save-msg');
  const newVal = input.value.trim();

  if (!newVal) {
    msgEl.textContent  = 'Username cannot be empty.';
    msgEl.className    = 'username-save-msg error';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Saving…';
  msgEl.textContent = '';

  try {
    await updateApplicationField(docId, { username: newVal });
    msgEl.textContent = '✓ Username updated — applicant will see the change immediately.';
    msgEl.className   = 'username-save-msg success';
    // Reflect in live allApplications list
    const app = allApplications.find(a => a.id === docId);
    if (app) app.username = newVal;
  } catch (err) {
    msgEl.textContent = 'Failed to update. Please try again.';
    msgEl.className   = 'username-save-msg error';
    console.error(err);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save';
  }
}

// Escape user content before injecting into innerHTML
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
