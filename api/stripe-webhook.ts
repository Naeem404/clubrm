import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

declare const process: { env: Record<string, string | undefined> }

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ""

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
    return res.status(500).json({ error: "STRIPE_SECRET_KEY is not configured" })
  }

  const sig = req.headers["stripe-signature"]
  if (!sig) {
    return res.status(400).json({ error: "Missing Stripe signature" })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret || "")
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return res.status(400).json({ error: "Webhook signature verification failed" })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const sessionId = metadata.session_id
        const userId = metadata.user_id
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const source = metadata.source || "Payment"
        const category = metadata.category || "payment"

        console.log(`Payment succeeded: ${session.id}`)

        if (supabase && sessionId) {
          try {
            await supabase
              .from("stripe_sessions")
              .update({
                status: "completed",
                payment_intent_id: session.payment_intent as string,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sessionId)
          } catch (err: any) {
            console.error("Failed to update session:", err)
          }
        }

        if (supabase && userId) {
          try {
            await supabase
              .from("income")
              .insert({
                id: `income-${session.id}`,
                source: `${source} (Stripe)`,
                amount,
                type: "donation",
                date: new Date(),
                notes: `Stripe payment session: ${session.id}`,
                recurring: false,
              })
          } catch (err: any) {
            console.error("Failed to record income:", err)
          }
        }

        break
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const sessionId = metadata.session_id

        console.log(`Payment expired: ${session.id}`)

        if (supabase && sessionId) {
          try {
            await supabase
              .from("stripe_sessions")
              .update({
                status: "expired",
                updated_at: new Date().toISOString(),
              })
              .eq("id", sessionId)
          } catch (err: any) {
            console.error("Failed to update session:", err)
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    res.status(500).json({ error: error.message || "Webhook handler failed" })
  }
}
