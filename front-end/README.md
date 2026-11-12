# Sebaka — Front-end (Cash me Up)

Vanilla HTML / CSS / JavaScript front-end for the **Cash me Up** loan app (Sebaka project).
No build step, no framework — open `index.html` in a browser and it runs.

## Current status — Sprint 1

| Ticket | Scope | Status |
|---|---|---|
| FE-2 | Referral code field on the sign-up screen | ✅ Done (demo mode) |
| FE-3 | Error states (loading / success / error / blocked) | ✅ Done (demo mode) |
| FE-4 | Offline queue (IndexedDB) | ⏳ Not started — depends on the online flow |
| FE-5 | Email verification (send 6-digit code + verify) | ✅ Send = live-ready; verify = mocked (no backend verify endpoint yet) |

## Run it

From the `front-end` folder:

```
open index.html
```

or any static server, e.g.:

```
cd front-end
python -m http.server 8000
# then visit http://localhost:8000
```

## Demo mode

The back-ends are not connected yet, so the referral check and the email code
are **mocked in the browser** with a small delay to show the loading states.

Referral codes:

| Code | Result |
|---|---|
| `REF-A-4821` | ✅ valid — "Code applied!" |
| `REF-EXPIRED-1` | ❌ "This code has expired." |
| `REF-USED-1` | ❌ "This code has already been used." |
| anything else | ❌ "That code isn't valid." |

Email verification: press **Send code** (no real email goes out in demo mode),
then **any 6 digits** pass verification. The real check arrives with the
back-end verify endpoint (see below).

## Connecting the real back-ends

There are two back-ends; `API_URL` in `js/app.js` drives both.

### A. Email-code API (Spring Boot, repo folder `api/`)

From `api/README.md` — the contract the page already speaks:

```
POST {API_URL}/api/v1/email-codes
Content-Type: application/json
{"email":"person@example.com"}
```

| Situation | Response |
|---|---|
| Success | `200` + `{"message":"Verification code sent."}` |
| Invalid/blank email | `400` |
| SMTP failure | `502` + `{"detail":"The verification email could not be sent. Please try again later."}` |

To connect:

1. Start the API: `cd api && mvn spring-boot:run` → it listens on
   `http://localhost:8080` (the port is printed in the console).
2. In `js/app.js` set:

   ```js
   const API_URL = "http://localhost:8080";
   ```

3. **CORS**: the browser blocks cross-origin calls unless the Spring app
   allows the page's origin. The back-end needs
   `@CrossOrigin(origins = "http://localhost:8000")` on the controller (or a
   global CORS config). "Works in Postman but not in the browser" = CORS.
   Run the page via `python -m http.server 8000` (not `file://`) so it has a
   real origin.
4. **SMTP**: the API's defaults (`MAIL_HOST=localhost`, `MAIL_PORT=1025`)
   only deliver to a local test mail server. For real inboxes set the
   `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` env vars (see `api/README.md`).

**Verify gap**: the Spring API only *sends* the code — it does not store it
and has no verify endpoint, so the 6-digit check stays mocked. When the
back-end adds e.g. `POST /api/v1/email-codes/verify` with
`{ "email", "code" }`, replace the `mockVerifyCode` call in
`verifyEmailCode()` (`js/app.js`, clearly marked `TODO(live)`) with a fetch.

### B. Referral validation (Supabase, planned)

1. Ask the back-end developer for the Supabase Edge Function URL, e.g.
   `https://<project-ref>.supabase.co/functions/v1`
2. In `js/app.js`, set `API_URL` accordingly (note: A and B live on different
   hosts — if they differ, split `API_URL` into two constants before going live).
3. The page calls `POST ${API_URL}/validate-referral` with
   `{ "code": "..." }` and expects back either:

   - success: `{ "ok": true,  "message": "Code applied!" }`
   - error:   `{ "ok": false, "message": "This code has already been used." }`

   HTTP 2xx = success, anything else = error. A CORS failure or network
   failure shows the generic "Couldn't connect. Please try again." message.

## Structure

This folder lives inside the shared `sebaka_majacode` repository on the
`Langa-Front-End` branch:

```
front-end/
├── index.html      # HTML only: the two screens (sign-up, home)
├── css/
│   └── style.css   # all styles; brand colors in the :root block at the top
├── js/
│   └── app.js      # all logic; set API_URL at the top of this file
├── README.md
└── .gitignore
```

## Roadmap

- **Sprint 2:** real authentication (Supabase Auth), log-in screen,
  loan application screen
- **FE-4:** offline queue — store pending referral codes in IndexedDB when
  there is no connection and sync when back online
- **Design:** swap the placeholder green brand in the `:root` CSS variables
  for the official Cash me Up brand colours and logo

## Demo data note

Sign-up in the current build is a **mock** (stored in `localStorage` under the
key `sebaka_demo_user`). It will be replaced by Supabase Auth in Sprint 2 —
nothing in the referral-code logic depends on it.
