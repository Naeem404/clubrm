/**
 * Vercel function: GET /api/dashboard/stats (rewritten to /api/stats).
 * Requires `Authorization: Bearer <supabase access token>`.
 * All logic lives in ./_lib so the Vite dev middleware serves identical data.
 */
import { handleStatsRequest } from "./_lib/handlers.js";
import type { ApiRequest, ApiResponse } from "./_lib/http.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  return handleStatsRequest(req, res, process.env);
}
