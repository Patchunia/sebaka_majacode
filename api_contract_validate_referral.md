# FE ↔ BE: validate-referral API contract & schema blockers

**From:** Langa (front-end) · **To:** Siyabonga (back-end) · **Date:** 11 Nov 2026
**Status:** Contract proposed — awaiting confirmation

## 1. Front-end status

- Sprint 1 complete: sign-up screen with referral code field (FE-2) and all error states (FE-3) — merged to `main` (PR #1), in the `front-end/` folder
- Currently in **demo mode** (referral responses are mocked in the browser, no backend needed)
- To go live, the front-end needs **one** Supabase Edge Function: `validate-referral`

## 2. Proposed API contract — `validate-referral`

| Item | Value |
|---|---|
| Type | Supabase Edge Function |
| URL | `https://<project-ref>.supabase.co/functions/v1/validate-referral` |
| Method | `POST` |
| Header | `Content-Type: application/json` |
| Request body | `{ "code": "REF-A-4821" }` |
| Success | HTTP 2xx + `{ "message": "Code applied!" }` |
| Error | HTTP 4xx + `{ "message": "<reason>" }` |

**Error cases the front-end must distinguish** (message strings):

| Case | Suggested message |
|---|---|
| Invalid code | `That code isn't valid.` |
| Expired | `This code has expired.` |
| Already used | `This code has already been used.` |

**How the front-end behaves:**

- HTTP 2xx → show the `message`, mark the code as applied
- Any other status → show the `message` (friendly fallback if missing)
- Network / CORS / bad-JSON failure → generic "Couldn't connect. Please try again."

**CORS:** please allow the front-end origin. I'll share the exact URL once it is hosted (or allow all origins during development).

## 3. Schema blockers found in the current SQL (`Siyabonga-Data-Base` branch)

These will fail or misbehave when run in Supabase:

| File | Issue | Fix |
|---|---|---|
| `loans.sql` | `TIMESTAPMPTZ` (typo) | → `TIMESTAMPTZ` |
| `loans.sql` | status list contains `'appr'` and `'oved'` (split string) | → `'approved'` |
| `profiles.sql` | `REFERANCES` (typo) | → `REFERENCES` |
| `profiles.sql` | column named `crated_` | → `created_at` |
| `profiles.sql` | RLS enabled but **no policies defined** | Add policies (e.g. users can read/update their own row) — with RLS on and zero policies, the app is denied on every query |
| (missing) | **`referrals` table does not exist** — the readme promises 3 tables (Loans, Referrals, Customer profiles) | Needed to track which code was used by whom and when — without it, "already used" cannot be detected |

**Suggested shape for the `referrals` table** (for discussion, not a decision):

```sql
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL REFERENCES public.profiles(referral_code),
  redeemed_by UUID NOT NULL REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. What I need from you to go live

1. The deployed Edge Function URL (your Supabase project ref)
2. Confirmation that CORS is enabled for the front-end
3. After that, I set `API_URL` in `front-end/js/app.js` (one-line change), test the full flow, and report back

## 5. Test codes

The front-end mock currently uses: `REF-A-4821` (valid), `REF-EXPIRED-1` (expired), `REF-USED-1` (already used).
If real codes are already generated, please share one test code per state so we can verify against live data.

---

Kind Regards,
Langa Patrick Magagula
Langa.patrick.magagula@huawei.com
Huawei Technologies Co., Ltd.
