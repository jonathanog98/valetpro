import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from "npm:twilio";

const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const from = Deno.env.get("TWILIO_FROM")!;
const to = Deno.env.get("SMS_TO")!;

const client = twilio(accountSid, authToken);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { message } = await req.json();

    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    return new Response(JSON.stringify({ success: true, sid: result.sid }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
