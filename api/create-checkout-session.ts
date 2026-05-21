import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

declare const process: { env: Record<string, string | undefined> }

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ""
const siteUrl = process.env.VITE_SITE_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || "http://localhost:5173"

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!stripe) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY is not configured on the server" })
  }

  try {
    const { amount, source, userId, category = "payment" } = req.body || {}

    const amountNum = Number(amount)
    const sourceStr = typeof source === "string" && source.trim()
      ? source.trim()
      : "ClubRM Payment"

    if (!Number.isFinite(amountNum) || amountNum < 0.5) {
      return res.status(400).json({ error: "Amount must be at least $0.50 CAD" })
    }

    const sessionId = crypto.randomUUID()
    const clientReferenceId = userId || sessionId

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: clientReferenceId,
      metadata: {
        session_id: sessionId,
        source: sourceStr,
        category,
        user_id: userId || "anonymous",
      },
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: sourceStr,
              description: `Payment for ${category}`,
            },
            unit_amount: Math.round(amountNum * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/finance?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/finance?stripe=cancelled&session_id={CHECKOUT_SESSION_ID}`,
    })

    if (supabase && userId) {
      try {
        await supabase.from("stripe_sessions").insert({
          id: sessionId,
          user_id: userId,
          stripe_session_id: session.id,
          amount: amountNum,
          source: sourceStr,
          category,
          status: "pending",
          created_at: new Date().toISOString(),
        })
      } catch (err: any) {
        console.error("Failed to log session to Supabase:", err)
      }
    }

    return res.status(200).json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error("Stripe checkout session error:", error)
    return res.status(500).json({ error: error.message || "Unable to create checkout session" })
  }
}
