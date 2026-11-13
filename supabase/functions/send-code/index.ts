import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, hashCode, json } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // auto-injected, never put in frontend
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const MAIL_FROM = Deno.env.get("MAIL_FROM")!; // e.g. "YourApp <no-reply@yourdomain.com>" (domain verified in Resend)

const CODE_TTL_MIN = 10;
const COOLDOWN_SEC = 60;
const MAX_PER_EMAIL_HOUR = 5;
const MAX_PER_IP_HOUR = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sixDigitCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let email: string;
  try {
    ({ email } = await req.json());
    email = String(email ?? "").trim().toLowerCase();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(req, { error: "Invalid email" }, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();

  // --- rate limits ---
  const { data: last } = await supabase
    .from("email_codes").select("created_at")
    .eq("email", email).order("created_at", { ascending: false }).limit(1);
  if (last?.[0] && Date.now() - new Date(last[0].created_at).getTime() < COOLDOWN_SEC * 1000) {
    return json(req, { error: "Please wait before requesting another code" }, 429);
  }

  const { count: emailCount } = await supabase
    .from("email_codes").select("id", { count: "exact", head: true })
    .eq("email", email).gte("created_at", hourAgo);
  if ((emailCount ?? 0) >= MAX_PER_EMAIL_HOUR) {
    return json(req, { error: "Too many requests, try again later" }, 429);
  }

  const { count: ipCount } = await supabase
    .from("email_codes").select("id", { count: "exact", head: true })
    .eq("ip", ip).gte("created_at", hourAgo);
  if ((ipCount ?? 0) >= MAX_PER_IP_HOUR) {
    return json(req, { error: "Too many requests, try again later" }, 429);
  }

  // --- invalidate older codes, store the new hash ---
  await supabase.from("email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", email).is("consumed_at", null);

  const code = sixDigitCode();
  const { data: row, error: insErr } = await supabase.from("email_codes").insert({
    email,
    ip,
    code_hash: await hashCode(email, code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
  }).select("id").single();
  if (insErr) return json(req, { error: "Could not create code" }, 500);

  // --- send ---
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: email,
      subject: "Your verification code",
      html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in ${CODE_TTL_MIN} minutes. If you didn't request it, ignore this email.</p>`,
    }),
  });
  if (!res.ok) {
    await supabase.from("email_codes").delete().eq("id", row.id);
    return json(req, { error: "Could not send email" }, 502);
  }

  return json(req, { ok: true });
});
