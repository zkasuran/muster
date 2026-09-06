import { fetchByPayTo, preferredAccept } from '../lib/bazaar.ts'
import { classify } from '../lib/classify.ts'
const res = await fetchByPayTo('0x515e7bce44baa5f6e42d16d4b5f27768e7f2f8cc')
console.log(`  ${res.length} resources for the one joined agent (id 127417)\n`)
for (const x of res) {
  const a = preferredAccept(x.accepts ?? [])
  const price = a ? (Number(BigInt(a.maxAmountRequired)) / 1e18).toFixed(4) : '?'
  const hits = classify({ name: x.resource, description: x.description ?? '' })
  console.log(`  ${x.resource.replace('https://', '')}`)
  console.log(`    ${a?.scheme} ${price} @ ${a?.asset.slice(0, 10)}  shelves=[${hits.map(h => h.shelf + ':' + h.basis).join(', ') || 'none'}]`)
  if (x.description && !x.description.startsWith('http')) console.log(`    ${x.description.slice(0, 190)}`)
}
