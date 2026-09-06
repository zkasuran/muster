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
      ],
    }]
  },
}

export default config
