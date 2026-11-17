import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, hashCode, json, safeEqual } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let email: string, code: string;
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    code = String(body.code ?? "").trim();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }
  if (!email || !/^\d{6}$/.test(code)) {
    return json(req, { error: "Invalid email or code" }, 400);
  }

  const { data: rows } = await supabase
    .from("email_codes").select("*")
    .eq("email", email).is("consumed_at", null)
    .order("created_at", { ascending: false }).limit(1);
  const row = rows?.[0];

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return json(req, { error: "Code expired or not found. Request a new one." }, 400);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return json(req, { error: "Too many attempts. Request a new code." }, 429);
  }

  const ok = safeEqual(await hashCode(email, code), row.code_hash);
  if (!ok) {
    await supabase.from("email_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return json(req, { error: "Incorrect code" }, 400);
  }

  const now = new Date().toISOString();
  await supabase.from("email_codes").update({ consumed_at: now, verified_at: now }).eq("id", row.id);
  return json(req, { ok: true, verified: true });
});