# Sebaka — Front-end (Cash me Up)

Vanilla HTML / CSS / JavaScript front-end for the **Cash me Up** loan app (Sebaka project).
No build step, no framework — open `index.html` in a browser and it runs.

## Current status — Sprint 1

| Ticket | Scope | Status |
|---|---|---|
| FE-2 | Referral code field on the sign-up screen | ✅ Done (demo mode) |
| FE-3 | Error states (loading / success / error / blocked) | ✅ Done (demo mode) |
| FE-4 | Offline queue (IndexedDB) | ⏳ Not started — depends on the online flow |

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

The back-end (Supabase Edge Function) is not connected yet, so the referral
check is **mocked in the browser** with a small delay to show the loading state.

| Code | Result |
|---|---|
| `REF-A-4821` | ✅ valid — "Code applied!" |
| `REF-EXPIRED-1` | ❌ "This code has expired." |
| `REF-USED-1` | ❌ "This code has already been used." |
| anything else | ❌ "That code isn't valid." |

## Connecting the real back-end

1. Ask the back-end developer for the Supabase Edge Function URL, e.g.
   `https://<project-ref>.supabase.co/functions/v1`
2. In `js/app.js`, find the `CONFIG` comment at the top of the file and set:

   ```js
   const API_URL = "https://<project-ref>.supabase.co/functions/v1";
   ```

3. The page will then call `POST ${API_URL}/validate-referral` with
   `{ "code": "..." }` and expect back either:

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
