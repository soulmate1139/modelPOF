'use strict';

// ─────────────────────────────────────────────────────────
// CLOUDINARY — file uploads (images / PDFs)
// ─────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = 'da8jagv9y';
const CLOUDINARY_UPLOAD_PRESET = 'model_uploads';

async function uploadToStorage(file, path) {
  const folder = path.substring(0, path.lastIndexOf('/'));

  const formData = new FormData();
  formData.append('file',          file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder',        folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json();
  return data.secure_url;
}

// ─────────────────────────────────────────────────────────
// FIREBASE — Firestore (database) + Auth (admin login)
// Get config: Firebase Console → Project Settings → Your apps → SDK setup
// ─────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBXH3urcyjF-MVTgT4knvh9GTuCR-ecMBU',
  authDomain:        'alliance-10ef5.firebaseapp.com',
  projectId:         'alliance-10ef5',
  storageBucket:     'alliance-10ef5.firebasestorage.app',
  messagingSenderId: '922068051903',
  appId:             '1:922068051903:web:cdb0c19818e5c62480630a',
};

let _db   = null;
let _auth = null;

function _initFirebase() {
  if (_db) return;
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  _db = firebase.firestore();
  // Auth SDK is only loaded on admin.html — guard so main form doesn't crash
  if (typeof firebase.auth === 'function') _auth = firebase.auth();
}

// Save a new application; returns the Firestore document ID
async function saveApplication(data) {
  _initFirebase();
  const ref = await _db.collection('applications').add({
    ...data,
    status:      'pending',
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// Real-time listener on a single application document
function watchApplication(docId, callback) {
  _initFirebase();
  return _db.collection('applications').doc(docId).onSnapshot(snap => {
    if (snap.exists) callback(snap.data());
  });
}

// Applicant re-verify: reset status back to pending
async function resetApplicationStatus(docId) {
  _initFirebase();
  return _db.collection('applications').doc(docId).update({ status: 'pending' });
}

// ── Admin-only helpers ────────────────────────────────────
function getAllApplications(callback) {
  _initFirebase();
  return _db.collection('applications')
    .orderBy('submittedAt', 'desc')
    .onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

async function updateStatus(docId, status) {
  _initFirebase();
  return _db.collection('applications').doc(docId).update({ status });
}

async function updateApplicationField(docId, fields) {
  _initFirebase();
  return _db.collection('applications').doc(docId).update(fields);
}

async function adminLogin(email, password) {
  _initFirebase();
  return _auth.signInWithEmailAndPassword(email, password);
}

async function adminLogout() {
  _initFirebase();
  return _auth.signOut();
}

function onAuthChange(callback) {
  _initFirebase();
  _auth.onAuthStateChanged(callback);
}
