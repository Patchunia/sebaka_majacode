# Backend: Database and Email Verification

Branch: `Siyabonga-Data-Base`
Owner: Siyabonga

This covers the Supabase database and the email verification API. The front end lives on `Langa-Front-End`.

## What was built

1. **Database schema** (PostgreSQL on Supabase) with Row Level Security.
2. **Email verification API** as two Supabase Edge Functions: `send-code` and `verify-code`.

Both were deployed to the Supabase project and tested end to end.

## Folder structure

```
supabase/
  migrations/
    001_schema.sql        # tables, trigger, RLS policies
  functions/
    _shared/cors.ts       # CORS, code hashing, constant-time compare
    send-code/index.ts    # generates, stores and emails a code
    verify-code/index.ts  # checks a submitted code
```

## Database

| Table | Purpose |
|---|---|
| `profiles` | Customer info: email, full name, phone, referral code, who referred them. Linked 1:1 to `auth.users`. |
| `loans` | Loan applications. Status is one of `pending`, `approved`, `rejected`, `disbursed`. Amount must be greater than 0. |
| `referrals` | Who referred whom. `referee_id` is unique, so a person can only be referred once. |
| `email_codes` | One-time verification codes (stored as hashes). Only the Edge Functions can read it. |

**Automatic profile creation:** a trigger on `auth.users` creates a `profiles` row when someone signs up. Pass `full_name` and `referral_code` as sign-up metadata:

```js
supabase.auth.signUp({
  email, password,
  options: { data: { full_name, referral_code } }
});
```

If the referral code is valid, the `referrals` row is created in the same step.

**Row Level Security:** enabled on every table.
- Users can read and update only their own profile (only `full_name` and `phone` are editable).
- Users can read their own loans and create loans for themselves with status `pending`.
- Users can read referrals where they are the referrer or referee.
- `email_codes` has no policies, so only the service role (Edge Functions) can access it.

## Email verification API

Base URL: `https://<PROJECT_REF>.supabase.co/functions/v1`

### `POST /send-code`

Body: `{ "email": "user@example.com" }`

- Generates a random 6-digit code and stores an HMAC hash of it (never the plain code).
- Code expires after 10 minutes. A new request invalidates any earlier code for that email.
- Sends the code with Resend.
- Rate limits: 60 seconds between sends per email, 5 per email per hour, 20 per IP per hour.

Responses: `200 {ok:true}`, `400` invalid email, `429` rate limited, `502` email send failed.

### `POST /verify-code`

Body: `{ "email": "user@example.com", "code": "123456" }`

- Compares the hash in constant time.
- Locks after 5 wrong attempts. A correct code can be used only once.

Responses: `200 {ok:true, verified:true}`, `400` incorrect or expired, `429` too many attempts.

Both functions are public (deployed with `--no-verify-jwt`) because users verify their email before they have an account.

## Secrets (set in Supabase, never committed)

| Name | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for sending email |
| `MAIL_FROM` | Sender address, e.g. `YourApp <onboarding@resend.dev>` |
| `CODE_PEPPER` | Random secret used to hash codes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed front-end origins |

Set them with:

```
supabase secrets set NAME=value
```

Do not commit `.env` files or keys.

## Deploying

```
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy send-code --no-verify-jwt
supabase functions deploy verify-code --no-verify-jwt
```

The schema was applied by running `001_schema.sql` against the database. Do not run it again on a database that already has the tables.

## Connecting the front end

Replace the mock in `app.js` (the `TODO(live)` marker) with calls to the two endpoints:

```js
const FN_URL = "https://<PROJECT_REF>.supabase.co/functions/v1";

async function sendCode(email) {
  const res = await fetch(`${FN_URL}/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not send code");
}

async function verifyCode(email, code) {
  const res = await fetch(`${FN_URL}/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data.verified === true;
}
```

The front end's address must be listed in `ALLOWED_ORIGINS`, otherwise the browser blocks the calls.

## Testing done

- Request a code: email received from Resend, `{ok:true}` returned.
- Correct code: `{ok:true, verified:true}`.
- Wrong code: `{"error":"Incorrect code"}`.
- Reusing a consumed code: `Code expired or not found`.

## Known gaps and next steps

- `validate-referral` pre-check function is not built yet (referrals are recorded by the sign-up trigger).
- Sign-up must check that `email_codes` has a `verified_at` within the last 30 minutes for that email, otherwise verification can be skipped.
- Sending is limited to the Resend test sender until a domain is verified in Resend. Then update `MAIL_FROM`.
- Add the deployed site URL to `ALLOWED_ORIGINS` before go-live.
- Real Supabase Auth and login are planned for Sprint 2.
- Add controller-level tests for the 400 and 429 paths.
