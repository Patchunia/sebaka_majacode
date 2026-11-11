/* ============================================================
   Cash me Up — app logic
   Sprint 1: FE-2 (referral code field) + FE-3 (error states)
   ============================================================ */

// ============================================================
// CONFIG — ask the back-end developer (Siyabonga) for the real
// Supabase Edge Function URL. Leave "" to stay in demo mode.
// Example: const API_URL = "https://<project>.supabase.co/functions/v1";
// The call below will then POST to `${API_URL}/validate-referral`.
// ============================================================
const API_URL = "";

// ---------- Element shortcuts ----------
const screenSignup = document.querySelector("#screen-signup");
const screenHome   = document.querySelector("#screen-home");
const nameInput    = document.querySelector("#full-name");
const phoneInput   = document.querySelector("#phone");
const passInput    = document.querySelector("#password");
const codeInput    = document.querySelector("#code-input");
const applyBtn     = document.querySelector("#apply-btn");
const signupBtn    = document.querySelector("#signup-btn");
const signoutBtn   = document.querySelector("#signout-btn");
const message      = document.querySelector("#message");

// ---------- App state ----------
let appliedCode = null;   // the verified referral code, or null
let codeVerified = false; // true once the backend (or mock) accepted it

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

// ---------- Sign-up (mock — real Supabase auth comes in Sprint 2) ----------
signupBtn.addEventListener("click", () => {
  const name  = nameInput.value.trim();
  const phone = phoneInput.value.replace(/[\s-]/g, "");
  const pass  = passInput.value;
  const code  = codeInput.value.trim();

  // Basic field validation
  if (!name)  return failSignup("Please enter your full name.");
  if (!/^\+?\d{7,15}$/.test(phone)) return failSignup("Please enter a valid phone number.");
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
    const user = { name, phone, referral: appliedCode };
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
  appliedCode = null;
  codeVerified = false;
  screenHome.classList.remove("active");
  screenSignup.classList.add("active");
});
