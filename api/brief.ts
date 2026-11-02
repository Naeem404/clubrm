/**
 * Vercel function: POST /api/brief
 * Requires `Authorization: Bearer <supabase access token>` and server env GEMINI_API_KEY.
 * Body (optional, ≤1 KB): { "roleHint": "<Role>" }
 * Response 200: { "summary": string, "role": string, "generatedAt": ISO string }
 * Errors: 401 auth, 405 method, 400/413 body, 429 rate limit, 502/503 AI unavailable, 500 generic.
 */
import { handleBriefRequest } from "./_lib/handlers.js";
import type { ApiRequest, ApiResponse } from "./_lib/http.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  return handleBriefRequest(req, res, process.env);
}
