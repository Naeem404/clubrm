/**
 * Minimal, framework-agnostic HTTP helpers shared by the Vercel functions
 * (api/*.ts) and the Vite dev middleware (vite.config.ts).
 *
 * Files under api/_lib are NOT deployed as functions by Vercel (underscore prefix).
 * Relative imports in api/** must use explicit ".js" extensions because the
 * package is "type": "module" and Vercel runs the compiled output as native ESM.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & { body?: unknown };
export type ApiResponse = ServerResponse;

/** Environment lookup — `process.env` on Vercel, `loadEnv()` output in Vite dev. */
export type ServerEnv = Record<string, string | undefined>;

export class HttpError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;
  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

export function sendJson(res: ApiResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function assertMethod(req: ApiRequest, allowed: string): void {
  if ((req.method || "GET").toUpperCase() !== allowed) {
    throw new HttpError(405, "Method not allowed", { Allow: allowed });
  }
}

/** Extracts the bearer token or throws 401. */
export function getBearerToken(req: ApiRequest): string {
  const raw = req.headers["authorization"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || typeof header !== "string") throw new HttpError(401, "Missing bearer token");
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match || match[1].length > 4096) throw new HttpError(401, "Invalid authorization header");
  return match[1];
}

/**
 * Reads a JSON body with a hard size limit. Uses the pre-parsed `req.body`
 * when the platform provides one (Vercel), otherwise reads the stream (Vite/connect).
 * An empty body yields `{}`.
 */
export async function readJsonBody(req: ApiRequest, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > maxBytes) throw new HttpError(413, "Request body too large");

  let preParsed: unknown;
  try {
    preParsed = req.body;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  if (preParsed !== undefined) {
    if (typeof preParsed === "string") return parseJson(preParsed, maxBytes);
    if (Buffer.isBuffer(preParsed)) return parseJson(preParsed.toString("utf8"), maxBytes);
    if (JSON.stringify(preParsed ?? {}).length > maxBytes) throw new HttpError(413, "Request body too large");
    return preParsed ?? {};
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buf.length;
    if (size > maxBytes) throw new HttpError(413, "Request body too large");
    chunks.push(buf);
  }
  return parseJson(Buffer.concat(chunks).toString("utf8"), maxBytes);
}

function parseJson(text: string, maxBytes: number): unknown {
  if (text.length > maxBytes) throw new HttpError(413, "Request body too large");
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/**
 * Converts any thrown value into a response. HttpErrors carry safe,
 * client-facing messages; anything else is logged and returned as a generic 500.
 */
export function sendError(res: ApiResponse, err: unknown, context: string): void {
  if (err instanceof HttpError) {
    sendJson(res, err.status, { error: err.message }, err.headers);
    return;
  }
  console.error(`[${context}]`, err);
  sendJson(res, 500, { error: "Internal server error" });
}
