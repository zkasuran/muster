import type { NextConfig } from 'next'

// Server rendered by default. The four shelves and the listing page must read with
// scripting off, which docs/03-TAXONOMY.md settles as the mobile decision, so nothing
// on the render path may depend on client hydration.
const config: NextConfig = {
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
      ],
    }]
  },
}

export default config
