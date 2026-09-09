/**
 * [doc 10] lib/publish-gate.ts. The pure checks are pinned with synthetic pass and fail inputs, then
 * the whole gate is run against the repository. The gate tells the truth rather than forcing a pass:
 * three checks pass on the current tree and the NOTICE check surfaces a real gap, so the test asserts
 * that real state. No network.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SAND_SPDX,
  licenseIsSand,
  noticeCoverage,
  dataSourceCoverage,
  isIgnoredHost,
  trackedPrivatePaths,
  publishGate,
} from './publish-gate.ts'

test('licenseIsSand looks for the entry SPDX id', () => {
  assert.equal(licenseIsSand(`SPDX-License-Identifier: ${SAND_SPDX}\n`), true)
  assert.equal(licenseIsSand('MIT License'), false)
})

test('noticeCoverage flags a dependency with no row and no alias', () => {
  const notice = 'Next.js, MIT. React, MIT. lucide, ISC.'
  const full = noticeCoverage(notice, ['next', 'react', 'react-dom', 'lucide-react'])
  assert.deepEqual(full.missing, [])
  const gap = noticeCoverage(notice, ['clsx', 'viem', 'next'])
  assert.deepEqual(gap.missing.sort(), ['clsx', 'viem'])
})

test('dataSourceCoverage matches a host by name or by its operator', () => {
  const ds = 'bsc-rpc.publicnode.com operated by Allnodes. B402 Bazaar operated by Binance.'
  const r = dataSourceCoverage(ds, [
    'bsc-rpc.publicnode.com',
    'bsc-testnet-rpc.publicnode.com',
    'www.binance.com',
    'nope.example.net',
  ])
  assert.deepEqual(r.missing, ['nope.example.net'])
  assert.ok(r.covered.includes('bsc-testnet-rpc.publicnode.com'))
  assert.ok(r.covered.includes('www.binance.com'))
})

test('isIgnoredHost drops reserved IPs, examples, self, schema ids and display links', () => {
  for (const h of [
    '10.0.0.1',
    '169.254.169.254',
    'agent.example.com',
    'localhost',
    'muster.zkasuran.dev',
    'json-schema.org',
    'eips.ethereum.org',
    'bscscan.com',
    'explorer.altana.network',
  ]) {
    assert.equal(isIgnoredHost(h), true, `${h} should be ignored`)
  }
  for (const h of ['bsc-rpc.publicnode.com', 'www.binance.com', 'bsc-dataseed.bnbchain.org']) {
    assert.equal(isIgnoredHost(h), false, `${h} is a real fetch host`)
  }
})

test('trackedPrivatePaths catches working dirs and secrets, not lookalikes', () => {
  const priv = trackedPrivatePaths([
    '.hq/MEMORY.md',
    'submit/SUBMIT.html',
    'archive/old',
    'lib/a.ts',
    'docs/decisions/15-system-one-process-holds-every-key.md',
    'docs/research/tools/metakeys.mjs',
    '.env',
    '.env.example',
    '.env.production',
    'deploy/tls.pem',
    'payout-key.txt',
    'components/nav.tsx',
  ])
  assert.deepEqual(priv.sort(), [
    '.env',
    '.env.production',
    '.hq/MEMORY.md',
    'archive/old',
    'deploy/tls.pem',
    'payout-key.txt',
    'submit/SUBMIT.html',
  ])
})

test('the gate runs against the repo and reports the truth', () => {
  const r = publishGate()
  const get = (name: string) => {
    const c = r.checks.find((x) => x.name === name)
    assert.ok(c, `no ${name} check`)
    return c
  }

  // All four checks hold on the current tree.
  assert.equal(get('license').ok, true, get('license').detail)
  assert.equal(get('dataSources').ok, true, get('dataSources').detail)
  assert.deepEqual(get('dataSources').missing, [])
  assert.equal(get('privatePaths').ok, true, get('privatePaths').detail)
  assert.deepEqual(get('privatePaths').missing, [])

  // NOTICE now lists every bundled runtime dependency, so the notice check passes too.
  assert.equal(get('notice').ok, true, get('notice').detail)
  assert.deepEqual(get('notice').missing, [])

  // Every check's ok agrees with its own missing list, and nothing blocks the flip today.
  for (const c of r.checks) {
    if (c.missing !== undefined) assert.equal(c.ok, c.missing.length === 0, `${c.name} ok disagrees with missing`)
  }
  assert.deepEqual(r.blocking, [])
  assert.equal(r.ok, true)
})
