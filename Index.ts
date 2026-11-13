// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, _ctx) => {
    const { to, subject, html } = await req.json();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "you@example.com",
        to,
        subject,
        html,
      }),
    });
    const data = await res.json();

    return Response.json(data);
  }),
};
