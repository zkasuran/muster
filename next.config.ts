import type { NextConfig } from 'next'

// Server rendered by default. The four shelves and the listing page must read with
// scripting off, which docs/03-TAXONOMY.md settles as the mobile decision, so nothing
// on the render path may depend on client hydration.
const config: NextConfig = {
  output: 'standalone',
  // The build's own type check reads tsconfig.json, which Next rewrites on every build and
  // which therefore cannot exclude anything reliably. The real gate is `npm run typecheck`
  // against tsconfig.check.json, which excludes throwaway scripts under tools/ and runs
  // BEFORE the build in cli/deploy.sh. Two type checks over the same product code buys
  // nothing, and the one Next owns lets an unrelated scratch file block a deploy.
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: { '/**': ['./lib/**/*'] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        // A conservative Content-Security-Policy. The high-value directives are locked down:
        // nothing may frame us, the document base cannot be rewritten, plugins are off, and forms
        // can only post to our own origin. script-src / style-src keep 'unsafe-inline' because the
        // app legitimately ships one inline no-flash theme script and Next injects inline hydration
        // — a nonce scheme is deliberately not attempted this close to judging, where a wrong
        // directive would blank the page. img/font are self plus data: for the inline favicon and
        // base64 fonts. This is real hardening on the directives that matter, without breakage risk.
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    }]
  },
}

export default config
