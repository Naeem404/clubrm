import { GoogleGenerativeAI } from "@google/generative-ai"

declare const process: { env: Record<string, string | undefined> }

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ""
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

interface BriefRequest {
  role?: string
  pendingTasks?: string[] | string
  upcomingEvents?: string[] | string
}

function asLines(value: BriefRequest["pendingTasks"]): string {
  if (!value) return "None"
  if (Array.isArray(value)) return value.length ? value.join("\n") : "None"
  return String(value).trim() || "None"
}

/**
 * Server-side proxy for the executive brief that previously called Gemini
 * directly from the client. The API key never leaves the server.
 *
 * Mounted at:
 *   - `/api/ai/brief` (Vercel)
 *   - via Vite middleware in dev (see vite.config.ts)
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!genAI) {
    return res.status(503).json({
      error: "AI brief unavailable",
      reason: "GEMINI_API_KEY is not configured on the server",
    })
  }

  try {
    const body: BriefRequest = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {})
    const role = (body.role || "executive").toString()
    const pending = asLines(body.pendingTasks)
    const upcoming = asLines(body.upcomingEvents)

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const prompt = [
      `You are a chief of staff briefing a student club ${role}.`,
      `Pending tasks:\n${pending}`,
      `Upcoming events:\n${upcoming}`,
      `Write a 2-sentence, action-oriented executive brief. No greetings.`,
    ].join("\n\n")

    const result = await model.generateContent(prompt)
    const summary = result.response.text().trim()
    return res.status(200).json({ summary })
  } catch (error: any) {
    console.error("[ai/brief] failure:", error)
    return res.status(500).json({ error: error.message || "AI request failed" })
  }
}
