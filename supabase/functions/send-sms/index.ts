import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { config } from "https://deno.land/std@0.192.0/dotenv/mod.ts";

const env = await config();

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { nombre, hora } = await req.json();

    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_FROM;
    const to = env.SMS_TO;

    const body = `Nuevo pickup tipo Loaner:\nNombre: ${nombre}\nHora de la cita: ${hora}`;

    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Twilio error:", result);
      return new Response("Twilio SMS failed", { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response("Server Error", { status: 500 });
  }
});
