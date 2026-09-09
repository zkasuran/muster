// Flat config for eslint 9. The Next presets cover React, hooks and the App Router rules. The
// product code is app/, components/, lib/ and worker/. tools/ holds one-off verification scripts
// that were run against the live chain and are kept as evidence, so they are not linted.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'tools/**', 'archive/**', 'docs/**', '.claude/**']),
  {
    rules: {
      // Every page here is a server component rendered once per request, with no client
      // hydration on the render path. The "3m ago" strings read the clock at render, which is
      // the request time and is exactly what "ago" means on a server-rendered page. The purity
      // rule exists for components that re-render on the client. None of these do.
      'react-hooks/purity': 'off',
      // worker/probe.ts declares a timer handle before the closure that clears it, then assigns
      // it once the request exists. Reading before the single assignment is the point.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    },
  },
])
