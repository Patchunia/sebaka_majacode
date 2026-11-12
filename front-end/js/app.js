/* ============================================================
   Cash me Up — app logic
   Sprint 1: FE-2 (referral code field) + FE-3 (error states)
   ============================================================ */

// ============================================================
// CONFIG — ask the back-end developer (Siyabonga) for the real
// Supabase Edge Function URL. Leave "" to stay in demo mode.
// Example: const API_URL = "https://<project>.supabase.co/functions/v1";
// The call below will then POST to `${API_URL}/validate-referral`.
//
// Email-code API (Spring Boot, from api/README.md):
//   POST {API_URL}/api/v1/email-codes   body: { "email": "..." }
//   200 -> {"message":"Verification code sent."}
//   400 -> invalid/blank email
//   502 -> SMTP failed: {"detail":"The verification email could not
//          be sent. Please try again later."}
// NOTE: the Spring API has no "verify" endpoint yet, so verification
// stays mocked until the backend stores the code and adds one.
// ============================================================
const API_URL = "http://localhost:8080";
const EMAIL_CODES_PATH = "/api/v1/email-codes";

// ---------- Element shortcuts ----------
const screenSignup = document.querySelector("#screen-signup");
const screenHome   = document.querySelector("#screen-home");
const nameInput    = document.querySelector("#full-name");
const phoneInput   = document.querySelector("#phone");
const emailInput   = document.querySelector("#email");
const verifyInput  = document.querySelector("#verify-input");
const sendCodeBtn  = document.querySelector("#send-code-btn");
const verifyBtn    = document.querySelector("#verify-btn");
const emailMessage = document.querySelector("#email-message");
const passInput    = document.querySelector("#password");
const codeInput    = document.querySelector("#code-input");
const applyBtn     = document.querySelector("#apply-btn");
const signupBtn    = document.querySelector("#signup-btn");
const signoutBtn   = document.querySelector("#signout-btn");
const message      = document.querySelector("#message");

// ---------- App state ----------
let appliedCode = null;   // the verified referral code, or null
let codeVerified = false; // true once the backend (or mock) accepted it
let emailCodeSent = false;  // true once "Send code" succeeded
let emailVerified = false;  // true once the 6-digit code was verified

// ---------- FE-3: message states ----------
function showMessage(text, kind) { // kind: info | success | error
  message.textContent = text;
  message.className = "message " + kind;
}
function clearMessage() {
  message.textContent = "";
  message.className = "message";
}

// ---------- Mock backend (demo mode only) ----------
function mockValidate(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (code === "REF-A-4821") {
        resolve({ ok: true,  message: "Code applied!" });
      } else if (code.startsWith("REF-EXPIRED")) {
        resolve({ ok: false, message: "This code has expired." });
      } else if (code.startsWith("REF-USED")) {
        resolve({ ok: false, message: "This code has already been used." });
      } else {
        resolve({ ok: false, message: "That code isn't valid." });
      }
    }, 800); // fake network latency so the loading state is visible
  });
}

// ---------- Real backend call (when API_URL is set) ----------
async function validateWithBackend(code) {
  const response = await fetch(`${API_URL}/validate-referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return { ok: true,  message: data.message || "Code applied!" };
  }
  return { ok: false, message: data.message || "That code isn't valid." };
}

// ---------- FE-2 action: apply the code (loading / success / error) ----------
async function applyReferralCode(code) {
  applyBtn.disabled = true;                 // loading state: stop double clicks
  showMessage("Checking your code...", "info");

  try {
    const result = API_URL
      ? await validateWithBackend(code)
      : await mockValidate(code);

    if (result.ok) {
      appliedCode = code;
      codeVerified = true;
      showMessage(result.message, "success");      // success state
    } else {
      appliedCode = null;
      codeVerified = false;
      showMessage(result.message, "error");        // error state (specific)
    }
  } catch (error) {
    // No network, server down, CORS, bad JSON, etc.
    appliedCode = null;
    codeVerified = false;
    showMessage("Couldn't connect. Please try again.", "error"); // error state (generic)
  } finally {
    applyBtn.disabled = false;
  }
}

applyBtn.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  if (!code) {
    showMessage("Please enter a code first.", "error");
    return;
  }
  applyReferralCode(code);
});

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); applyBtn.click(); }
});
codeInput.addEventListener("input", () => {
  codeVerified = false; // editing the code invalidates a previous verification
  if (appliedCode) { appliedCode = null; }
});

// ============================================================
// FE-5: EMAIL VERIFICATION (Spring Boot email-code API)
//
// Live mode (API_URL set):
//   "Send code" -> POST {API_URL}/api/v1/email-codes  { "email": "..." }
//     200 -> {"message":"Verification code sent."}
//     400 -> bad/blank email
//     502 -> SMTP failed (their RFC-7807 ProblemDetail, field "detail")
//
// Verify is mocked in BOTH modes for now: the Spring API does not store
// the code and has no verify endpoint. When the backend adds one
// (e.g. POST /api/v1/email-codes/verify with { "email", "code" }),
// replace the body of verifyEmailCode() with a fetch like sendCodeWithBackend().
// ============================================================

// ---------- FE-5: message states (own message box, like the referral one) ----------
function showEmailMessage(text, kind) { // kind: info | success | error
  emailMessage.textContent = text;
  emailMessage.className = "message " + kind;
}
function clearEmailMessage() {
  emailMessage.textContent = "";
  emailMessage.className = "message";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Real backend call: send the 6-digit code (200/400/502) ----------
async function sendCodeWithBackend(email) {
  const response = await fetch(`${API_URL}${EMAIL_CODES_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    return { ok: true, message: data.message || "Verification code sent." };
  }
  // Their 502 (and probably 400) use the RFC-7807 "detail" field.
  return { ok: false, message: data.detail || data.message || "Couldn't send the code. Please try again." };
}

// ---------- Mock send (demo mode only — no real email goes out) ----------
function mockSendCode() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, message: "Code sent (demo mode — no real email was sent)." });
    }, 800); // fake latency so the loading state is visible
  });
}

// ---------- FE-5 action: send the code ----------
async function sendEmailCode() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    showEmailMessage("Please enter your email address first.", "error");
    return;
  }
  if (!EMAIL_RE.test(email)) {
    showEmailMessage("That doesn't look like a valid email address.", "error");
    return;
  }

  sendCodeBtn.disabled = true;              // loading state: stop double clicks
  showEmailMessage("Sending your code...", "info");

  try {
    const result = API_URL
      ? await sendCodeWithBackend(email)
      : await mockSendCode();

    if (result.ok) {
      emailCodeSent = true;
      emailVerified = false;                // a new code invalidates the old check
      showEmailMessage(result.message, "success");
    } else {
      emailCodeSent = false;
      showEmailMessage(result.message, "error");
    }
  } catch (error) {
    // Network down, API not running, CORS blocked, bad JSON...
    emailCodeSent = false;
    showEmailMessage("Couldn't connect. Is the API running? (CORS errors also show up here.)", "error");
  } finally {
    sendCodeBtn.disabled = false;
  }
}

// ---------- Mock verify (both modes, until the backend adds a verify endpoint) ----------
function mockVerifyCode(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (/^\d{6}$/.test(code)) {
        resolve({ ok: true, message: "Email verified (demo mode — the real check comes with the backend verify endpoint)." });
      } else {
        resolve({ ok: false, message: "Enter the 6-digit code from your email." });
      }
    }, 600);
  });
}

// ---------- FE-5 action: verify the 6-digit code ----------
async function verifyEmailCode() {
  const email = emailInput.value.trim().toLowerCase();
  const code = verifyInput.value.trim();

  if (!email) {
    showEmailMessage("Please enter your email address first.", "error");
    return;
  }
  if (!emailCodeSent) {
    showEmailMessage("Press \"Send code\" first, then enter the code you received.", "error");
    return;
  }

  verifyBtn.disabled = true;
  showEmailMessage("Checking your code...", "info");

  try {
    // TODO(live): when the backend adds a verify endpoint, replace this with:
    //   const response = await fetch(`${API_URL}/api/v1/email-codes/verify`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ email, code }),
    //   });
    const result = await mockVerifyCode(code);

    if (result.ok) {
      emailVerified = true;
      showEmailMessage(result.message, "success");
    } else {
      emailVerified = false;
      showEmailMessage(result.message, "error");
    }
  } catch (error) {
    emailVerified = false;
    showEmailMessage("Couldn't connect. Please try again.", "error");
  } finally {
    verifyBtn.disabled = false;
  }
}

// ---------- FE-5: buttons + input listeners ----------
sendCodeBtn.addEventListener("click", sendEmailCode);
verifyBtn.addEventListener("click", verifyEmailCode);

verifyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); verifyBtn.click(); }
});

// Editing the email or the code invalidates the previous verification
emailInput.addEventListener("input", () => {
  emailCodeSent = false;
  emailVerified = false;
});
verifyInput.addEventListener("input", () => {
  emailVerified = false;
});

// ---------- Sign-up (mock — real Supabase auth comes in Sprint 2) ----------
signupBtn.addEventListener("click", () => {
  const name  = nameInput.value.trim();
  const phone = phoneInput.value.replace(/[\s-]/g, "");
  const email = emailInput.value.trim().toLowerCase();
  const pass  = passInput.value;
  const code  = codeInput.value.trim();

  // Basic field validation
  if (!name)  return failSignup("Please enter your full name.");
  if (!/^\+?\d{7,15}$/.test(phone)) return failSignup("Please enter a valid phone number.");
  if (!email) return failSignup("Please enter your email address.");
  if (!EMAIL_RE.test(email)) return failSignup("Please enter a valid email address.");
  if (!emailVerified) return failSignup("Please verify your email first: press \"Send code\", then enter the 6-digit code.");
  if (pass.length < 8) return failSignup("Password must be at least 8 characters.");
  if (code && !codeVerified) {
    // A code is present but hasn't been verified yet
    return failSignup("Please apply the referral code first (or remove it).");
  }

  // Loading state for sign-up
  signupBtn.disabled = true;
  signupBtn.textContent = "Creating account...";

  // Mock delay — replace with real Supabase auth later
  setTimeout(() => {
    const user = { name, phone, email, referral: appliedCode };
    localStorage.setItem("sebaka_demo_user", JSON.stringify(user));
    showHome(user);
    signupBtn.disabled = false;
    signupBtn.textContent = "Create account";
  }, 800);
});

function failSignup(text) {
  showMessage(text, "error");
  message.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showHome(user) {
  document.querySelector("#welcome-name").textContent = user.name.split(" ")[0];
  const ref = document.querySelector("#ref-status");
  if (user.referral) {
    ref.className = "ref-status success";
    ref.textContent = "Referral code " + user.referral + " applied — you and your referrer will both earn a bonus once your first loan is disbursed.";
  } else {
    ref.className = "ref-status neutral";
    ref.textContent = "No referral code added. You can still borrow — just add one before your first loan.";
  }
  screenSignup.classList.remove("active");
  screenHome.classList.add("active");
}

// ---------- Sign out (demo only — resets to the sign-up screen) ----------
signoutBtn.addEventListener("click", () => {
  localStorage.removeItem("sebaka_demo_user");
  document.querySelector("#signup-form").reset();
  clearMessage();
  clearEmailMessage();
  appliedCode = null;
  codeVerified = false;
  emailCodeSent = false;
  emailVerified = false;
  screenHome.classList.remove("active");
  screenSignup.classList.add("active");
});
