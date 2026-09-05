# Decision: we run our own validator, label it as ours and give it zero weight

Recorded by `06-QUALITY.md` section 5, with `09-DISPUTES.md` writing decisions in validation-response
shape plus `10-docs-validation-registry-status.md` owning how the status is published.

## The decision

Muster requests a validation on its own listings through the ERC-8004 Validation Registry, answers it as
the validator, publishes both legs, labels the pair as first-party and scores it at **zero weight**.
Muster writes `appendResponse` only. It never writes `giveFeedback` about a listing it ranks.

## The alternative rejected

No validation at all, since the registry is unused on BSC. Or present the resulting badge as
third-party validation, which is what the badge would look like to a reader who does not check.

## Why

The registry is deployed, wired plus callable, carrying zero validations across 1,999 sampled ids and
zero platform-wide. So a real request plus a real response is a genuine artifact that costs two calls
and it turns a claim about our process into something a judge reads with `getAgentValidations`.

`validationRequest` is owner-authorised, so the pair can only be first-party. That is the reason for both
guardrails: zero weight is what stops it being self-scoring, then the label is what stops it being a
claim we cannot support. Writing `giveFeedback` about listings we rank would be self-dealing on a public
registry, feeding our own opinion back into our own ranking.

## What it binds

`06-QUALITY.md`'s signal families, `09-DISPUTES.md`'s on-chain writes, `10-DOCS-AND-POLICY.md`'s
disclosure table which carries the status plus all three qualifiers in one cell so the two cannot be
read apart, `04-AGENT-PROTOCOL.md` which does not gate on a validation.

## What would make us revisit it

A third-party validator existing on BSC. Then the general case ships, the weight stops being zero and
the label stops being necessary. Today it is neither available nor claimable.
