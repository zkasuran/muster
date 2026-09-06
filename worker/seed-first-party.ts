/**
 * Put the four first-party agents on the shelves.
 *
 * They occupy a reserved id space, 900000001 upward, which cannot collide with the registry:
 * the highest minted ERC-8004 id on BSC is around 336,000 and the counter would have to grow by
 * three orders of magnitude to reach it. A reserved id is not a registry id and the UI says so.
 *
 * Their rung is `payable` and not `settled`. They return an HTTP 402 with requirements a buyer
 * can satisfy, which is what `payable` means, and `settled` requires a payment that actually
 * cleared. Promoting them without one would be exactly the dishonesty this build argues
 * against.
 */
import { db, tx } from '../lib/db.ts'
import { FIRST_PARTY } from '../lib/agents.ts'
import { CHAIN_ID } from '../lib/registry.ts'
import { TOKENS } from '../lib/constants.ts'
import { keccak256, toHex } from 'viem'

const RESERVED_BASE = 900_000_000
const PUBLIC_ORIGIN = process.env.MUSTER_ORIGIN_URL ?? 'https://muster.zkasuran.dev'
const PAY_TO = process.env.MUSTER_PAYTO ?? null

export function seedFirstParty(): { agents: number; listings: number; payable: number } {
  const now = Date.now()
  let agents = 0
  let listings = 0
  let payable = 0

  tx(() => {
    const upAgent = db().prepare(
      `INSERT INTO agent (chainId, agentId, owner, agentWallet, tokenUri, tokenUriHash, name,
                          description, endpoints, skills, serviceKinds, declaresX402,
                          declaresActive, trustModels, registrationParsed, firstSeenBlock,
                          lastSeenBlock, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,?,1,0,0,?)
       ON CONFLICT(chainId, agentId) DO UPDATE SET
         name = excluded.name, description = excluded.description,
         endpoints = excluded.endpoints, skills = excluded.skills,
         serviceKinds = excluded.serviceKinds, tokenUri = excluded.tokenUri,
         tokenUriHash = excluded.tokenUriHash, updatedAt = excluded.updatedAt`,
    )
    const upListing = db().prepare(
      `INSERT INTO listing (listingId, chainId, agentId, category, visibility, lifecycleState,
                            evidenceTier, priceBase, priceToken, priceDecimals, priceScheme,
                            payTo, firstParty, updatedAt)
       VALUES (?,?,?,?,'listed','live',?,?,?,?,'eip3009',?,1,?)
       ON CONFLICT(chainId, agentId, category) DO UPDATE SET
         evidenceTier = excluded.evidenceTier, priceBase = excluded.priceBase,
         priceToken = excluded.priceToken, priceDecimals = excluded.priceDecimals,
         priceScheme = excluded.priceScheme, payTo = excluded.payTo,
         visibility = excluded.visibility, lifecycleState = excluded.lifecycleState,
         updatedAt = excluded.updatedAt`,
    )

    FIRST_PARTY.forEach((a, i) => {
      const agentId = String(RESERVED_BASE + i + 1)
      const endpoint = `${PUBLIC_ORIGIN}/api/agent/${a.slug}`
      // The record we WOULD register on chain, byte for byte, so registering later changes
      // nothing a buyer already read. Shape follows the registration-v1 records on BSC.
      const record = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: a.name,
        description: a.summary,
        image: '',
        active: true,
        x402Support: true,
        supportedTrust: ['reputation'],
        services: [
          { name: 'API', endpoint, version: '1', skills: [a.slug] },
          { name: 'web', endpoint: `${PUBLIC_ORIGIN}/agent/${agentId}` },
        ],
      }
      const tokenUri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(record)).toString('base64')

      upAgent.run(
        CHAIN_ID,
        agentId,
        PAY_TO ? PAY_TO.toLowerCase() : '0x0000000000000000000000000000000000000000',
        PAY_TO ? PAY_TO.toLowerCase() : null,
        tokenUri,
        keccak256(toHex(tokenUri)),
        a.name,
        a.summary,
        JSON.stringify([endpoint]),
        JSON.stringify([a.slug]),
        JSON.stringify(['API', 'web']),
        JSON.stringify(['reputation']),
        now,
      )
      agents++

      // `payable` only once a payout address exists, because without one the endpoint returns
      // 503 rather than a 402 a buyer could satisfy. The rung follows the evidence.
      const tier = PAY_TO ? 'payable' : 'probed'
      if (PAY_TO) payable++
      upListing.run(
        `${CHAIN_ID}:${agentId}:${a.slug}`,
        CHAIN_ID,
        agentId,
        a.slug,
        tier,
        a.priceBase,
        TOKENS.USD1.address,
        TOKENS.USD1.decimals,
        PAY_TO ?? null,
        now,
      )
      listings++
    })
  })

  return { agents, listings, payable }
}

if (import.meta.filename === process.argv[1]) {
  const r = seedFirstParty()
  console.log(`seeded ${r.agents} first-party agents, ${r.listings} listings, ${r.payable} at the payable rung`)
  if (!process.env.MUSTER_PAYTO) {
    console.log('MUSTER_PAYTO is unset, so they sit at `probed` and the endpoint returns 503 rather')
    console.log('than a 402 nobody could satisfy. Set it to make them payable.')
  }
}
