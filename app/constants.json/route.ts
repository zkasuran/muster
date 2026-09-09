/**
 * [doc 10] GET /constants.json. The machine-readable constants file docs/10 section 4 condition 6
 * asks for, served as the exact bytes lib/provenance.ts fingerprints. Deterministic, so it is safe
 * to cache and safe to diff against the published prose.
 */
import { NextResponse } from 'next/server'
import { constantsJson } from '@/lib/constants-json'

export function GET() {
  return new NextResponse(constantsJson(), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
