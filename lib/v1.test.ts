/**
 * The /v1 paging envelope and the generated OpenAPI document. Pure logic only, no db and no
 * network: these assertions pin the envelope shape the document fixes and the contract that a
 * paged route publishes, so a change to either shows up here rather than in a client.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  paging,
  envelope,
  openApiDocument,
  notBuiltBody,
  ROUTES,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from './v1.ts'

function sp(qs: string): URLSearchParams {
  return new URLSearchParams(qs)
}

test('paging defaults to page 1 and the default page size', () => {
  const p = paging(sp(''))
  assert.equal(p.page, 1)
  assert.equal(p.pageSize, DEFAULT_PAGE_SIZE)
  assert.equal(p.offset, 0)
})

test('pageSize is clamped to the 100 ceiling and never below 1', () => {
  assert.equal(paging(sp('pageSize=1000')).pageSize, MAX_PAGE_SIZE)
  assert.equal(paging(sp('pageSize=0')).pageSize, DEFAULT_PAGE_SIZE)
  assert.equal(paging(sp('pageSize=-5')).pageSize, DEFAULT_PAGE_SIZE)
  assert.equal(paging(sp('pageSize=abc')).pageSize, DEFAULT_PAGE_SIZE)
  assert.equal(paging(sp('pageSize=25')).pageSize, 25)
})

test('page below 1 or not a number falls back to 1, and the offset follows the page', () => {
  assert.equal(paging(sp('page=0')).page, 1)
  assert.equal(paging(sp('page=-2')).page, 1)
  assert.equal(paging(sp('page=zzz')).page, 1)
  const p = paging(sp('page=3&pageSize=20'))
  assert.equal(p.page, 3)
  assert.equal(p.offset, 40)
})

test('the envelope carries exactly the five documented fields', () => {
  const e = envelope([{ a: 1 }, { a: 2 }], 55, 2, 20)
  assert.deepEqual(Object.keys(e).sort(), ['items', 'page', 'pageSize', 'total', 'totalPages'])
  assert.equal(e.items.length, 2)
  assert.equal(e.total, 55)
  assert.equal(e.page, 2)
  assert.equal(e.pageSize, 20)
})

test('totalPages is the ceiling of total over pageSize', () => {
  assert.equal(envelope([], 0, 1, 50).totalPages, 0)
  assert.equal(envelope([], 1, 1, 50).totalPages, 1)
  assert.equal(envelope([], 50, 1, 50).totalPages, 1)
  assert.equal(envelope([], 51, 1, 50).totalPages, 2)
  assert.equal(envelope([], 100, 1, 50).totalPages, 2)
  assert.equal(envelope([], 101, 1, 50).totalPages, 3)
})

test('the OpenAPI document is 3.1 with a populated licence and one path per route', () => {
  const doc = openApiDocument('https://muster.zkasuran.dev')
  assert.equal(doc['openapi'], '3.1.0')
  const info = doc['info'] as Record<string, unknown>
  const license = info['license'] as Record<string, unknown>
  assert.equal(license['name'], 'LicenseRef-zkasuran-SAND-1.0')
  assert.ok(String(license['url']).startsWith('https://muster.zkasuran.dev'))
  const paths = doc['paths'] as Record<string, unknown>
  for (const r of ROUTES) {
    assert.ok(paths[r.path], `path ${r.path} present in the document`)
  }
})

test('a paged route publishes the envelope schema with pageSize capped at 100', () => {
  const doc = openApiDocument('https://x')
  const paths = doc['paths'] as Record<string, Record<string, Record<string, unknown>>>
  const get = paths['/v1/listings']?.['get'] as Record<string, unknown>
  const resp = get['responses'] as Record<string, Record<string, unknown>>
  const content = resp['200']?.['content'] as Record<string, Record<string, Record<string, unknown>>>
  const schema = content['application/json']?.['schema'] as Record<string, unknown>
  assert.deepEqual((schema['required'] as string[]).sort(), ['items', 'page', 'pageSize', 'total', 'totalPages'])
  const props = schema['properties'] as Record<string, Record<string, unknown>>
  assert.equal(props['pageSize']?.['maximum'], MAX_PAGE_SIZE)
})

test('a route not built in this entry publishes a 404 with a reason, and no 200', () => {
  const doc = openApiDocument('https://x')
  const paths = doc['paths'] as Record<string, Record<string, Record<string, unknown>>>
  const get = paths['/v1/ledger']?.['get'] as Record<string, unknown>
  const resp = get['responses'] as Record<string, unknown>
  assert.ok(resp['404'])
  assert.equal(resp['200'], undefined)
  const body = notBuiltBody('/v1/ledger')
  assert.equal(body?.error, 'not_built')
  assert.ok(body && body.detail.length > 0)
})

test('notBuiltBody returns null for a route that is built', () => {
  assert.equal(notBuiltBody('/v1/listings'), null)
  assert.equal(notBuiltBody('/v1/agents'), null)
})

test('every route in the table is a GET and has a summary', () => {
  for (const r of ROUTES) {
    assert.equal(r.method, 'GET')
    assert.ok(r.summary.length > 0, `${r.path} has a summary`)
  }
})
