# Backend tasks — Cash me Up (Sebaka)

**To:** Siyabonga (back-end) · **From:** Langa (front-end) · **Date:** 12 Nov 2026

**Why this doc exists:** the front-end (`front-end/`) and the email-code API (`api/`) now run together locally end to end (browser → Spring API → SMTP sink mailbox, real 6-digit code). The front-end still **mocks two things** — email *verify* and *referral validation* — because the back-end pieces below do not exist yet. This is the complete list to un-mock them and make the schema safe to run in Supabase.

**Repo layout (after this PR):**

```
sebaka_majacode/
├── front-end/                     # existing (Sprint 1, FE-2/FE-3 + FE-5 email UI)
├── api/                           # NEW: Spring Boot email-code API (Java 21, Maven)
├── local-test/smtp_sink.py        # NEW: fake local mailbox on 127.0.0.1:1025
├── api_contract_validate_referral.md   # FE↔BE contract (validate-referral)
├── BACKEND_TASKS.md               # this file
└── readme
```

---

## Priority 0 — blocks the front-end going live

### T1. Store the verification code + add a verify endpoint (Spring, `api/`)

**Problem:** `EmailCodeService.sendCode()` generates the code, emails it, and **throws it away**. The API has no way to check a code, so the front-end "Verify" button stays mocked — *any 6 digits pass* today.

**Do:**
1. Store each sent code in a new bean (e.g. `EmailCodeStore`): `email → (code, sentAt, failedAttempts)`. An in-memory `ConcurrentHashMap` is fine for now; note in a comment that it must become Redis/DB if the API ever runs multi-instance.
2. New endpoint:
   - `POST /api/v1/email-codes/verify`
   - Body: `{ "email": "person@example.com", "code": "476745" }`
   - `200` → `{ "message": "Email verified." }`
   - `400` → ProblemDetail with `detail: "The code is incorrect or has expired."`
     — one generic message for wrong / expired / unknown (do not reveal which case).
3. Rules (all as properties, not hard-coded):
   - Code expires **10 min** after sending (`email.code.ttl-seconds=600`)
   - Code is **single-use**: delete on successful verify
   - A new "send code" replaces the previously stored code
   - Max **5 failed** verify attempts per email → then a new code is required
4. Tests: success, wrong code, expired code, reused code, attempt limit.

**Front-end follow-up (Langa, ~10 min):** replace the `TODO(live)` mock inside `verifyEmailCode()` in `front-end/js/app.js` with a fetch to this endpoint. The shapes above are exactly what the page will send and read.

---

### T2. Rate-limit code sending (Spring, `api/`)

**Problem:** `POST /api/v1/email-codes` is unlimited — anyone can trigger unlimited emails to any address (abuse + SMTP cost once a real provider is configured).

**Do:** per email — minimum **60 s** between sends, max **5 per day**. Return `429` with ProblemDetail `detail: "Too many verification requests. Please try again later."`. Limits as properties. Reuse the `EmailCodeStore` from T1. Add tests.

---

### T3. Fix the Supabase schema (branch `Siyabonga-Data-Base`)

Already flagged in `api_contract_validate_referral.md` §3 — as written, the SQL **will not run** in Supabase:

| File | Issue | Fix |
|---|---|---|
| `loans.sql` | `TIMESTAPMPTZ` typo | → `TIMESTAMPTZ` |
| `loans.sql` | status list contains `'appr','oved'` (one word split into two literals) | → `'approved'` |
| `Customer profiles.sql` | `REFERANCES` typo | → `REFERENCES` |
| `Customer profiles.sql` | column named `crated_` | → `created_at` |
| `Customer profiles.sql` | RLS enabled but **zero policies** → every query is denied | Add at least: users can `SELECT`/`UPDATE` their own row (`auth.uid() = id`) |
| — (missing) | **`referrals` table does not exist** — the readme promises 3 tables (Loans, Referrals, Customer profiles) | Create it (shape below). **T4 depends on this.** |

Suggested shape (from the contract doc — discuss, not a decision):

```sql
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  redeemed_by UUID NOT NULL REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### T4. Build `validate-referral` (Supabase Edge Function, TypeScript)

**Contract** (proposed and awaiting confirmation in `api_contract_validate_referral.md` §2):

- `POST {SUPABASE_URL}/validate-referral`
- Body: `{ "code": "REF-A-4821" }`
- `2xx` → `{ "message": "Code applied!" }`
- `4xx` → `{ "message": "<reason>" }` — exactly these three distinguishable messages:
  - `That code isn't valid.`
  - `This code has expired.`
  - `This code has already been used.`

**Logic:** look up the code in `profiles.referral_code` → check expiry → insert into `referrals` (unique on `code`) to mark it used; a unique-violation on that insert **is** the "already used" case.

**Note:** the schema has **no expiry field** today, so "expired" cannot actually happen. Add one (e.g. `valid_until TIMESTAMPTZ` on `profiles`) and propose the shape in your PR.

**CORS:** allow the front-end origin (`*` is acceptable during development, per the contract doc).

**Front-end follow-up (Langa):** set the referral URL in `front-end/js/app.js` once deployed.

---

## Priority 1 — before any real deployment (not needed for local work)

### T5. Proper CORS configuration (Spring, `api/`)

`EmailCodeController` currently has `@CrossOrigin(origins = "http://localhost:8000")` hard-coded (commented "LOCAL TEST ONLY"). Move to a property (e.g. `app.cors.allowed-origins`, comma-separated, default `http://localhost:8000`) via a `WebMvcConfigurer`/`CorsFilter`, and configure the production origin at deploy time.

### T6. Real SMTP configuration

The API defaults to `localhost:1025` (the local sink). For deployment set the env vars documented in `api/README.md` (Gmail example: `MAIL_HOST=smtp.gmail.com`, port `587`, `MAIL_SMTP_AUTH=true`, `MAIL_SMTP_STARTTLS=true`, **app password**). **Never commit credentials** — put them in deploy notes / secrets, not in code or `.properties`.

---

## Priority 2 — Sprint 2 / nice-to-have

- **T7. Real sign-up (Supabase Auth):** front-end sign-up is a `localStorage` mock until this exists. Contract: sign-up posts name / phone / email / password (+ optional applied referral code); creates the `auth.users` + `profiles` row that `referrals.redeemed_by` references.
- Controller-level test for the `400` validation path (blank / invalid email).
- Optional: `spring-boot-starter-actuator` + `/actuator/health` for deployment pipelines.

---

## Dependency map — what the front-end waits on

| Front-end feature | Blocked by |
|---|---|
| Email "Verify" (real check) | **T1** |
| "Send code" spam protection | **T2** (API-side only, no front-end change) |
| Referral "Apply code" (live) | **T4** (needs **T3** for the tables) |
| Real sign-up | **T7** (Sprint 2) |

When both back-ends are live on different hosts, the front-end splits `API_URL` into two constants — a one-line change by Langa.

---

## Running the back-end locally (reference)

```sh
cd api
mvn spring-boot:run     # needs JDK 21 + Maven 3.9; listens on :8080
mvn test                # unit tests
```

To see the code without a real SMTP server, run the fake mailbox first:

```sh
python local-test/smtp_sink.py
# listens on 127.0.0.1:1025; prints each "email" and appends it to sink_mail.log
```

Langa's Windows one-click launcher (opens sink + API + front-end in 3 windows) is `run-local-test.bat` in his working copy — it pins machine-specific Java/Python paths, so treat it as a template, not a committed script.
