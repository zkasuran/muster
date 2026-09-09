/**
 * The public origin, which is NOT `req.url`. The app listens on 127.0.0.1 behind a reverse proxy,
 * so `new URL(req.url).origin` reads as localhost. A document that names localhost as its own base
 * URL is unusable to anyone off this machine, so prefer the configured origin, then the forwarded
 * headers, then the request. Framework-free on purpose: it takes only a header reader, so a lib can
 * call it without importing next/server.
 */
export function publicOrigin(headers: { get(name: string): string | null }, fallbackOrigin: string): string {
  const configured = process.env.MUSTER_ORIGIN_URL
  if (configured) return configured.replace(/\/+$/, '')
  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  if (host) return `${headers.get('x-forwarded-proto') ?? 'https'}://${host}`
  return fallbackOrigin
}
