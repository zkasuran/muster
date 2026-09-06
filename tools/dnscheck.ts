import { lookup } from 'node:dns/promises'
console.log('=== does DNS resolution work in this process at all? ===')
for (const h of ['api.xona-agent.com', 'muster.zkasuran.dev', 'example.com', 'localhost', 'localtest.me', '127.0.0.1.nip.io', 'metadata.google.internal']) {
  try {
    const a = await lookup(h, { all: true })
    console.log(`  ${h.padEnd(28)} -> ${a.map((x) => x.address).join(', ')}`)
  } catch (e) {
    console.log(`  ${h.padEnd(28)} -> FAILED ${(e as Error).message.slice(0, 60)}`)
  }
}
