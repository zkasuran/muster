#!/usr/bin/env python3
"""Detect which published A2A revision a live agent card validates against.

Usage: python3 r12-a2a-card-validate.py <card.json> [card.json ...]

Schemas are the committed a2a.json per tag for 0.1.0 / 0.2.6 / 0.3.0 plus the
generated 1.0 artifact published on the docs site. All four are draft-07 or
2020-12 and are validated with the matching validator class.
"""
import json, sys, os
from jsonschema import Draft7Validator, Draft202012Validator

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raw")
SCHEMAS = [
    ("0.1.0", os.path.join(RAW, "r12-a2a-schema-v0.1.0-2026-09-05.json"), Draft7Validator),
    ("0.2.6", os.path.join(RAW, "r12-a2a-schema-v0.2.6-2026-09-05.json"), Draft7Validator),
    ("0.3.0", os.path.join(RAW, "r12-a2a-schema-v0.3.0-2026-09-05.json"), Draft7Validator),
    ("1.0",   os.path.join(RAW, "r12-a2a-schema-v1.0-published-2026-09-05.json"), Draft202012Validator),
]


def agent_card_subschema(path):
    full = json.load(open(path))
    defs = full.get("definitions") or full.get("$defs") or {}
    sub = dict(defs["AgentCard"])
    sub["definitions"] = defs
    sub["$defs"] = defs
    return json.loads(json.dumps(sub).replace('"#/$defs/', '"#/definitions/'))


def shape_hint(card):
    if "supportedInterfaces" in card:
        return "1.0 (supportedInterfaces present)"
    pv = card.get("protocolVersion")
    if isinstance(pv, str) and pv.startswith("0.3"):
        return "0.3.x (protocolVersion 0.3)"
    if isinstance(pv, str) and pv.startswith("0.2"):
        return "0.2.x (protocolVersion 0.2)"
    if pv:
        return f"unknown protocolVersion {pv!r}"
    if "authentication" in card:
        return "0.1.0 (authentication block, no protocolVersion)"
    return "0.1.0 or non-card (no protocolVersion, no supportedInterfaces)"


def report(path):
    card = json.load(open(path))
    print(f"\n=== {os.path.basename(path)}")
    print(f"   shape hint: {shape_hint(card)}")
    for name, spath, cls in SCHEMAS:
        try:
            sub = agent_card_subschema(spath)
        except Exception as exc:
            print(f"   {name}: schema load failed {exc}")
            continue
        errs = sorted(cls(sub).iter_errors(card), key=lambda e: list(e.path))
        if not errs:
            print(f"   {name}: VALID")
        else:
            msgs = [f"{'/'.join(str(p) for p in e.path) or '<root>'}: {e.message[:90]}" for e in errs[:5]]
            print(f"   {name}: {len(errs)} error(s)")
            for m in msgs:
                print(f"      - {m}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    for p in sys.argv[1:]:
        report(p)
