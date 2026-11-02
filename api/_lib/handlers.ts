/**
 * Request handlers shared by the Vercel functions and the Vite dev middleware.
 * They only use Node's base IncomingMessage/ServerResponse API so they work in both.
 */
import { authenticate } from "./auth.js";
import { computeDashboardStats } from "./compute-stats.js";
import { BRIEF_MAX_BODY_BYTES, checkRateLimit, generateBrief } from "./brief.js";
import { HttpError, assertMethod, readJsonBody, sendError, sendJson } from "./http.js";
import type { ApiRequest, ApiResponse, ServerEnv } from "./http.js";

/** GET /api/dashboard/stats (and /api/stats) */
export async function handleStatsRequest(req: ApiRequest, res: ApiResponse, env: ServerEnv): Promise<void> {
  try {
    assertMethod(req, "GET");
    const { supabase, user } = await authenticate(req, env);
    const payload = await computeDashboardStats(supabase, user.id);
    sendJson(res, 200, payload);
  } catch (err) {
    sendError(res, err, "stats");
  }
}

/** POST /api/brief  body: { roleHint?: Role } → { summary, role, generatedAt } */
export async function handleBriefRequest(req: ApiRequest, res: ApiResponse, env: ServerEnv): Promise<void> {
  try {
    assertMethod(req, "POST");
    const { supabase, user } = await authenticate(req, env);
    checkRateLimit(user.id);
    const body = await readJsonBody(req, BRIEF_MAX_BODY_BYTES);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "Body must be a JSON object");
    }
    const result = await generateBrief(supabase, user, body as { roleHint?: unknown }, env);
    sendJson(res, 200, result);
  } catch (err) {
    sendError(res, err, "brief");
  }
}
