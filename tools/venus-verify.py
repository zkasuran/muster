#!/usr/bin/env python3
"""Independent check of lib/venus.ts. Raw batched JSON-RPC and hand-rolled ABI codec on
purpose: the module and its gate both go through viem, so a codec bug or an arithmetic order
bug would agree with itself in both places. Nothing here imports the module.

Run: python3 tools/venus-verify.py [account]
"""
import json
import sys
import time
import urllib.request

RPCS = [
    "https://bsc-rpc.publicnode.com",
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
]
COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384"

SEL = {
    "getAccountSnapshot": "c37f68e2",
    "symbol": "95d89b41",
    "getUnderlyingPrice": "fc57d4df",
    "getEffectiveLtvFactor": "19ef3e8b",
    "getVAIRepayAmount": "78c2f922",
    "getAccountLiquidity": "5ec88c79",
    "getBorrowingPower": "528a174c",
    "getAssetsIn": "abfceffc",
    "markets": "8e8f294b",
    "getAllMarkets": "b0772d0b",
    "underlying": "6f307dc3",
    "decimals": "313ce567",
    "oracle": "7dc0d1d0",
    "vaiController": "9254f5e5",
}
E18 = 10 ** 18


def word(v):
    if isinstance(v, str):
        return v.lower().replace("0x", "").rjust(64, "0")
    return format(v, "064x")


def cd(name, *args):
    return "0x" + SEL[name] + "".join(word(a) for a in args)


class Rpc:
    def __init__(self):
        self.url = RPCS[0]
        self.calls = 0

    def batch(self, reqs):
        """One HTTP round trip per batch, rotating endpoints when one throttles."""
        payload = [{"jsonrpc": "2.0", "id": i, **r} for i, r in enumerate(reqs)]
        last = None
        for attempt in range(12):
            url = RPCS[attempt % len(RPCS)]
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode(),
                    headers={"content-type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=45) as r:
                    out = json.load(r)
                if isinstance(out, dict):
                    raise RuntimeError(str(out)[:200])
                self.calls += len(reqs)
                self.url = url
                return [x["result"] if "result" in x else {"error": x.get("error")}
                        for x in sorted(out, key=lambda x: x["id"])]
            except Exception as e:  # noqa: BLE001
                last = e
                time.sleep(0.6 * (attempt + 1))
        raise RuntimeError(f"every endpoint refused: {last}")

    def calls_at(self, items, block):
        """items: list of (to, calldata). block: hex height or 'latest'."""
        out = []
        for i in range(0, len(items), 20):
            chunk = items[i:i + 20]
            out += self.batch([
                {"method": "eth_call", "params": [{"to": to, "data": data}, block]}
                for to, data in chunk
            ])
        return out


def as_uint(x):
    return None if not isinstance(x, str) or len(x) < 3 else int(x[2:66] or "0", 16)


def as_tuple(x, n):
    if not isinstance(x, str) or len(x) < 2 + 64 * n:
        return None
    b = x[2:]
    return tuple(int(b[i * 64:(i + 1) * 64], 16) for i in range(n))


def as_addr(x):
    return None if not isinstance(x, str) or len(x) < 66 else "0x" + x[26:66]


def as_addr_array(x):
    if not isinstance(x, str) or len(x) < 130:
        return None
    b = x[2:]
    n = int(b[64:128], 16)
    return ["0x" + b[128 + i * 64 + 24: 128 + (i + 1) * 64] for i in range(n)]


def as_string(x):
    if not isinstance(x, str) or len(x) < 130:
        return None
    b = x[2:]
    n = int(b[64:128], 16)
    return bytes.fromhex(b[128:128 + n * 2]).decode("utf8", "replace")


fails = []


def check(label, ok, detail=""):
    if not ok:
        fails.append(label)
    print(f"{'PASS' if ok else 'FAIL'}  {label}  {detail}")


rpc = Rpc()
account = (sys.argv[1] if len(sys.argv) > 1 else "0x61486edf787168addd1eb791bd7496977094d607").lower()

head = rpc.batch([{"method": "eth_blockNumber", "params": []},
                  {"method": "eth_chainId", "params": []},
                  {"method": "eth_getCode", "params": [COMPTROLLER, "latest"]}])
tip = int(head[0], 16)
blk = hex(tip)
print(f"rpc {rpc.url}  chainId {int(head[1], 16)}  pinned block {tip}")
code_bytes = (len(head[2]) - 2) // 2
check("comptroller carries code", code_bytes > 0, f"{code_bytes} bytes")
check("chain is 56", int(head[1], 16) == 56, head[1])

oracle_r, vai_r = rpc.calls_at(
    [(COMPTROLLER, cd("oracle")), (COMPTROLLER, cd("vaiController"))], blk)
oracle, vai_ctl = as_addr(oracle_r), as_addr(vai_r)
print(f"oracle {oracle}  vaiController {vai_ctl}")

assets = as_addr_array(rpc.calls_at([(COMPTROLLER, cd("getAssetsIn", account))], blk)[0])
check("getAssetsIn answers", assets is not None, f"{len(assets or [])} entered markets")

legs = []
for v in assets:
    legs += [
        (v, cd("getAccountSnapshot", account)),
        (v, cd("symbol")),
        (oracle, cd("getUnderlyingPrice", v)),
        (COMPTROLLER, cd("getEffectiveLtvFactor", account, v, 0)),
        (COMPTROLLER, cd("getEffectiveLtvFactor", account, v, 1)),
        (COMPTROLLER, cd("markets", v)),
    ]
res = rpc.calls_at(legs, blk)
check("every position leg answered", len(res) == len(legs) and all(
    isinstance(r, str) for r in res), f"{sum(1 for r in res if isinstance(r, str))} of {len(legs)}")

tailc = rpc.calls_at([
    (vai_ctl, cd("getVAIRepayAmount", account)),
    (COMPTROLLER, cd("getAccountLiquidity", account)),
    (COMPTROLLER, cd("getBorrowingPower", account)),
], blk)
vai = as_uint(tailc[0])
check("getVAIRepayAmount answered", vai is not None, str(vai))
vai = vai or 0
liq = as_tuple(tailc[1], 3)
power = as_tuple(tailc[2], 3)

print()
hdr = ("market".ljust(9) + "vBalance".rjust(14) + "exchangeRateStored".rjust(31) +
       "price".rjust(26) + "CF".rjust(20) + "LT".rjust(20) + "mkCF".rjust(20) +
       "collAtLT".rjust(15) + "debtUsd".rjust(14))
print(hdr)
sum_lt = 0
sum_cf = 0
sum_borrow = vai
rows = []
for j, v in enumerate(assets):
    b = j * 6
    snap = as_tuple(res[b], 4)
    sym = as_string(res[b + 1])
    price = as_uint(res[b + 2])
    cf = as_uint(res[b + 3])
    lt = as_uint(res[b + 4])
    mk = as_tuple(res[b + 5], 3)
    assert snap is not None and snap[0] == 0, f"snapshot error on {v}"
    _, vbal, borrow, er = snap
    # Same truncating integer order ComptrollerLens uses. Order matters: a division that
    # happens one step earlier loses different digits and stops reconciling to the wei.
    coll_lt = (((lt * er) // E18) * price // E18) * vbal // E18
    coll_cf = (((cf * er) // E18) * price // E18) * vbal // E18
    debt = price * borrow // E18
    sum_lt += coll_lt
    sum_cf += coll_cf
    sum_borrow += debt
    rows.append((sym, v, vbal, borrow, er, price, cf, lt, mk[1], coll_lt, debt))
    print(sym.ljust(9) + str(vbal).rjust(14) + str(er).rjust(31) + str(price).rjust(26) +
          str(cf).rjust(20) + str(lt).rjust(20) + str(mk[1]).rjust(20) +
          f"{coll_lt / 1e18:.4f}".rjust(15) + f"{debt / 1e18:.4f}".rjust(14))

print(f"\ngetVAIRepayAmount         {vai}")
print(f"sumCollateral(LT) wei     {sum_lt}  = ${sum_lt / 1e18:.6f}")
print(f"sumCollateral(CF) wei     {sum_cf}  = ${sum_cf / 1e18:.6f}")
print(f"sumBorrowPlusEffects wei  {sum_borrow}  = ${sum_borrow / 1e18:.6f}")
print(f"chain getAccountLiquidity err {liq[0]} liquidity {liq[1]} shortfall {liq[2]}")
print(f"chain getBorrowingPower   err {power[0]} liquidity {power[1]} shortfall {power[2]}")

check("recompute(LT) equals getAccountLiquidity to the wei",
      sum_lt - sum_borrow == liq[1] - liq[2], f"local {sum_lt - sum_borrow} chain {liq[1] - liq[2]}")
check("recompute(CF) equals getBorrowingPower to the wei",
      sum_cf - sum_borrow == power[1] - power[2],
      f"local {sum_cf - sum_borrow} chain {power[1] - power[2]}")

if sum_borrow > 0:
    hf = sum_lt / sum_borrow
    print(f"\nhand HF = {sum_lt} / {sum_borrow} = {hf:.6f}")
    print(f"hand drop to HF 1 = (1 - 1/{hf:.6f}) * 100 = {(1 - 1 / hf) * 100:.4f} %")
    check("shortfall is zero exactly when HF is at or above 1",
          (liq[2] == 0) == (sum_lt >= sum_borrow), f"shortfall {liq[2]} hf {hf:.6f}")
else:
    print("\nno debt, so there is no health factor to hand check")

# The scaling claim in the module header, checked rather than assumed: price is
# 1e(36 - underlyingDecimals) and exchangeRateStored is 1e(18 + underlyingDecimals - 8).
print()
und = rpc.calls_at([(r[1], cd("underlying")) for r in rows], blk)
unds = [as_addr(u) for u in und]
dec = rpc.calls_at([(u, cd("decimals")) for u in unds if u], blk)
dmap = {}
k = 0
for u in unds:
    if u:
        dmap[u] = as_uint(dec[k])
        k += 1
for (sym, v, vbal, borrow, er, price, cf, lt, mkcf, coll_lt, debt), u in zip(rows, unds):
    d = dmap.get(u, 18) if u else 18
    exp_price = 36 - d
    exp_er = 18 + d - 8
    got_price = len(str(price)) - 1
    got_er = len(str(er)) - 1
    print(f"  {sym.ljust(9)} decimals {str(d).rjust(2)}  price 1e{got_price} (expect ~1e{exp_price})"
          f"  exchangeRate 1e{got_er} (expect ~1e{exp_er})  cfEffective {cf/1e18} marketCF {mkcf/1e18}")

print(f"\n{'VERIFY PASS' if not fails else 'VERIFY FAIL: ' + ', '.join(fails)}")
print(f"raw rpc calls made: {rpc.calls}")
sys.exit(1 if fails else 0)
