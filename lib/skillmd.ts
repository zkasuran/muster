/**
 * Parse a skill.md the way an operator hands one over, so an agent built on any platform can be
 * onboarded by dropping its descriptor rather than retyping it. Two shapes are accepted, because the
 * two are what actually turn up:
 *
 *   1. A Markdown file with YAML-ish frontmatter, the SKILL.md convention: a `---` fenced block of
 *      `key: value` lines, then a Markdown body. We read name, description, endpoint (or url), price,
 *      token, skills, and take the body as the long description when the frontmatter has none.
 *   2. A JSON agent card (A2A, x402 or OASF), which many platforms already emit. That is delegated to
 *      parseAgentCard, so anything the marketplace can read off a live endpoint can also be pasted in.
 *
 * The parse is pure and total: it never throws, it returns what it could read and lists what it could
 * not, so the form can prefill the known fields and ask for the rest rather than failing on a partial
 * file. It reads text only, so there is no network and no code execution: a skill.md is data.
 */
import { parseAgentCard } from './agentcard.ts'

export interface ParsedSkill {
  name: string | null
  description: string | null
  /** The service endpoint the agent answers on, if the file named one. */
  endpoint: string | null
  /** A human price string as written, e.g. "0.02 USD1", kept verbatim for the operator to confirm. */
  price: string | null
  /** A token symbol or address, if the file named one separately from the price. */
  token: string | null
  /** Skill strings: OASF paths, A2A skill names, or a comma/-newline list from the frontmatter. */
  skills: string[]
  /** Which shape it was read from, shown so the operator knows what was understood. */
  source: 'frontmatter' | 'json-card' | 'markdown' | 'empty'
  /** Fields a listing wants that this file did not carry, so the form can ask for them. */
  missing: string[]
}

const WANTED = ['name', 'description', 'endpoint'] as const

function splitFrontmatter(text: string): { fm: string | null; body: string } {
  // A leading --- fence, then key: value lines, then a closing --- . Tolerant of leading blank lines
  // and of \r\n, because a file dragged in from another OS carries carriage returns.
  const t = text.replace(/\r\n/g, '\n').replace(/^﻿/, '')
  const m = /^\s*---\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(t)
  if (m) return { fm: m[1] ?? '', body: (m[2] ?? '').trim() }
  return { fm: null, body: t.trim() }
}

function parseFrontmatter(fm: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  let currentList: string | null = null
  for (const raw of fm.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (line.trim() === '') { currentList = null; continue }
    // A YAML list item under the previous key: "  - value".
    const item = /^\s*-\s+(.*)$/.exec(line)
    if (item && currentList) {
      const arr = (out[currentList] as string[] | undefined) ?? []
      arr.push(stripQuotes(item[1] ?? ''))
      out[currentList] = arr
      continue
    }
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!kv) continue
    const key = (kv[1] ?? '').toLowerCase()
    const val = (kv[2] ?? '').trim()
    if (val === '') {
      // A key with nothing after the colon opens a list, e.g. "skills:" then "- a".
      currentList = key
      out[key] = []
      continue
    }
    currentList = null
    // An inline list, [a, b, c].
    const inline = /^\[(.*)\]$/.exec(val)
    if (inline) {
      out[key] = (inline[1] ?? '').split(',').map((s) => stripQuotes(s.trim())).filter(Boolean)
    } else {
      out[key] = stripQuotes(val)
    }
  }
  return out
}

function stripQuotes(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1)
  return t
}

function asString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v.join(', ') || null
  return v && v.trim() ? v.trim() : null
}

function asList(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean)
  if (typeof v === 'string' && v.trim()) return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
  return []
}

export function parseSkillFile(text: string): ParsedSkill {
  const empty: ParsedSkill = { name: null, description: null, endpoint: null, price: null, token: null, skills: [], source: 'empty', missing: [...WANTED] }
  if (!text || text.trim() === '') return empty

  // A JSON agent card takes precedence: if the file parses as an object, read it as a card.
  const head = text.trim().slice(0, 1)
  if (head === '{' || head === '[') {
    const card = parseAgentCard(text)
    if (card) {
      const skills = card.skills.map((s) => s.id || s.name).filter(Boolean)
      const price = card.accepts[0] ? `${card.accepts[0].amount} on ${card.accepts[0].network}` : null
      const p: ParsedSkill = {
        name: card.name,
        description: card.description,
        endpoint: card.url,
        price,
        token: card.accepts[0]?.asset ?? null,
        skills,
        source: 'json-card',
        missing: [],
      }
      p.missing = WANTED.filter((k) => !p[k])
      return p
    }
  }

  const { fm, body } = splitFrontmatter(text)
  const f = fm !== null ? parseFrontmatter(fm) : {}
  // The Markdown body is a fallback description, and its first ATX heading a fallback name.
  const bodyName = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? null
  const bodyDesc = body ? body.replace(/^#\s+.+$/m, '').trim().slice(0, 2000) || null : null

  const p: ParsedSkill = {
    name: asString(f['name']) ?? bodyName,
    description: asString(f['description']) ?? bodyDesc,
    endpoint: asString(f['endpoint']) ?? asString(f['url']) ?? asString(f['service']),
    price: asString(f['price']),
    token: asString(f['token']) ?? asString(f['asset']),
    skills: asList(f['skills']).length ? asList(f['skills']) : asList(f['capabilities']),
    source: fm !== null ? 'frontmatter' : 'markdown',
    missing: [],
  }
  p.missing = WANTED.filter((k) => !p[k])
  return p
}

/** A worked skill.md, shown on the onboarding page so an operator sees the shape they can hand over. */
export const SKILL_MD_EXAMPLE = `---
name: Venus Liquidation Guard
description: Watches a Venus borrow position and warns before it can be liquidated.
endpoint: https://my-agent.example.com/a2a
price: 0.05 USD1
token: USD1
skills:
  - risk_management/liquidation
  - defi/health factor monitoring
---

# Venus Liquidation Guard

Reads a borrower's Venus position, returns the health factor and the price move that
liquidates it, and suggests the cheapest repay. One paragraph is enough; this body becomes
the listing description when the frontmatter has none.
`
