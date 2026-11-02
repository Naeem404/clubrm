/**
 * Sanitise user-provided URLs before they reach an `href` / `src`.
 *
 * Free-text fields (LinkedIn, website, social handles…) can contain
 * `javascript:`, `data:` or `vbscript:` URLs which execute script when
 * clicked. `safeExternalUrl` only ever returns an absolute `https://` URL
 * (http is upgraded) or `null` – callers should render plain text / nothing
 * when it returns null.
 */
export interface SafeUrlOptions {
  /**
   * Optional allow-list of hostnames. A host matches if it is equal to an
   * entry or is a sub-domain of it (e.g. "www.linkedin.com" matches "linkedin.com").
   */
  allowedHosts?: readonly string[]
  /** Upgrade `http:` to `https:` (default true). When false, http URLs are kept as-is. */
  upgradeHttp?: boolean
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export function safeExternalUrl(
  input: string | null | undefined,
  options: SafeUrlOptions = {},
): string | null {
  if (typeof input !== "string") return null
  // Strip whitespace and ASCII control chars (browsers ignore them inside schemes, e.g. "java\tscript:")
  // eslint-disable-next-line no-control-regex
  const trimmed = input.replace(/[\u0000-\u001F\u007F]/g, "").trim()
  if (!trimmed) return null

  // Allow bare domains like "linkedin.com/in/foo" by assuming https.
  // Anything that already looks like it has a scheme ("xyz:") is parsed as-is so that
  // `javascript:` etc. are rejected rather than turned into "https://javascript:...".
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  const candidate = hasScheme
    ? trimmed
    : trimmed.startsWith("//")
      ? `https:${trimmed}`
      : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null
  if (!url.hostname || !url.hostname.includes(".")) return null
  // Never allow embedded credentials (phishing vector: https://good.com@evil.com)
  if (url.username || url.password) return null

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const host = url.hostname.toLowerCase()
    const ok = options.allowedHosts.some((h) => {
      const allowed = h.toLowerCase()
      return host === allowed || host.endsWith(`.${allowed}`)
    })
    if (!ok) return null
  }

  if (url.protocol === "http:" && options.upgradeHttp !== false) {
    url.protocol = "https:"
  }

  return url.toString()
}

/** Props to spread on external <a> tags. */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const
