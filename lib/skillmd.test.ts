/**
 * lib/skillmd.ts. The parser is pure and total, so it is pinned with the shapes an operator actually
 * hands over: a SKILL.md with frontmatter, a bare Markdown file, a JSON agent card, and junk.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSkillFile, SKILL_MD_EXAMPLE } from './skillmd.ts'

test('reads frontmatter, a list under a key, and the body as fallback', () => {
  const p = parseSkillFile(SKILL_MD_EXAMPLE)
  assert.equal(p.source, 'frontmatter')
  assert.equal(p.name, 'Venus Liquidation Guard')
  assert.match(p.description ?? '', /Watches a Venus borrow position/)
  assert.equal(p.endpoint, 'https://my-agent.example.com/a2a')
  assert.equal(p.price, '0.05 USD1')
  assert.deepEqual(p.skills, ['risk_management/liquidation', 'defi/health factor monitoring'])
  assert.deepEqual(p.missing, [])
})

test('an inline list and quoted values parse', () => {
  const p = parseSkillFile('---\nname: "Grid Bot"\nskills: [trading/grid trading strategy, defi/grid levels]\n---\n')
  assert.equal(p.name, 'Grid Bot')
  assert.deepEqual(p.skills, ['trading/grid trading strategy', 'defi/grid levels'])
})

test('a bare markdown file uses the first heading and body', () => {
  const p = parseSkillFile('# Yield Router\n\nRanks live supply yields on BSC after cost.')
  assert.equal(p.source, 'markdown')
  assert.equal(p.name, 'Yield Router')
  assert.match(p.description ?? '', /Ranks live supply yields/)
  assert.ok(p.missing.includes('endpoint'))
})

test('a JSON agent card is read as a card, not as text', () => {
  const card = JSON.stringify({
    name: 'Range Pilot',
    description: 'Moves your liquidity back into range.',
    url: 'https://pilot.example.com',
    skills: [{ id: 'portfolio/rebalancing', name: 'rebalancing' }],
    accepts: [{ scheme: 'eip3009', network: 'eip155:56', asset: '0xUSD1', maxAmountRequired: '20000000000000000' }],
  })
  const p = parseSkillFile(card)
  assert.equal(p.source, 'json-card')
  assert.equal(p.name, 'Range Pilot')
  assert.equal(p.endpoint, 'https://pilot.example.com')
  assert.ok(p.skills.includes('portfolio/rebalancing'))
})

test('empty input is empty, never a throw', () => {
  assert.equal(parseSkillFile('').source, 'empty')
  assert.equal(parseSkillFile('   \n  ').source, 'empty')
})

test('carriage returns from another OS do not break the fence', () => {
  const p = parseSkillFile('---\r\nname: CRLF Agent\r\ndescription: made on windows\r\n---\r\nbody\r\n')
  assert.equal(p.name, 'CRLF Agent')
  assert.equal(p.description, 'made on windows')
})
