# R13 Prior art: marketplace mechanisms that already work

Research pass for the BNB Agent Studio marketplace build. Written 2026-09-05. Every mechanism below
is named, attributed to an operator that runs it in production and quoted from a page I read today or
a source file I fetched today. Verified and unverified are separated. Formulas are given in runnable
form, not described.

## Headline

The six problems in the brief are all solved problems and the solutions that survive contact with a
huge low-quality catalogue share one shape: **a cheap machine-checkable gate at listing time, a score
that shrinks toward a prior until evidence accumulates and a published rule that says what happens
when someone games it.** Two live operators give the paste-ready blueprint for an agent marketplace
specifically. OpenRouter's provider routing is the assignment engine (price-weighted randomised
dispatch, inverse-square weighting, 30-second outage memory, deprioritise instead of exclude, rolling
5-minute percentile windows). Stripe's dispute object is the evidence schema (30 named evidence
fields plus `due_by`, `submission_count`, `past_due`). Both are copyable in an afternoon. The
expensive mechanisms (human arbitration, editorial curation, trusted-flagger programs) are the ones
to publish as policy and stub, not build.

The single most decision-relevant number: Steam counts a review toward a product's score **only if
the account bought the product on Steam**, while still letting anyone who launched it write one. That
is verified-purchase-only reputation with an open comment layer and it is the cheapest defence
against the exact failure mode this catalogue has (287,029 registered agents, almost none transacting).

## Verified facts

| Claim | Value | How verified |
| --- | --- | --- |
| Apple bans duplicate-per-variant listings by rule, not by count | Guideline 4.3(a): "Don't create multiple Bundle IDs of the same app (for example, submitting a separate map app for every city in the world instead of a single worldwide map...)" | Read `https://developer.apple.com/app-store/review/guidelines/` 2026-09-05, saved `raw/r13-apple-review-guidelines-2026-09-05.html` |
| Apple bans indistinguishable listings and names the dead categories | 4.3(b): "Certain kinds of apps, such as dating, flashlight, sound effects, wallpaper, simple timers, and fortune telling, are well established on the App Store and we will not accept new submissions unless they offer a meaningfully different or improved experience." | Same page |
| Apple removes listings that stop working | "Apps that stop working or offer a degraded experience may be removed from the App Store at any time." | Same page, section 4 preamble |
| Apple category model is primary plus secondary, with subcategories only for Games | "you can choose up to two Games subcategories"; Kids uses age bands 5 and under, 6 to 8, 9 to 11; every category carries a one-line definition plus a "For example:" list | Read `https://developer.apple.com/app-store/categories/` 2026-09-05, saved `raw/r13-apple-categories-2026-09-05.html` |
| Google Play has a named Repetitive Content rule | "We don't allow apps that merely provide the same experience as other apps already on Google Play." Bullets: "Copying content from other apps without adding any original content or value." and "Creating multiple apps with highly similar functionality, content, and user experience." | Read `https://support.google.com/googleplay/android-developer/answer/9899034` 2026-09-05 |
| Google Play has a minimum-functionality floor | "We do not allow apps that only have limited functionality and content." Examples include "Apps that are static without app-specific functionalities" and "Apps that are designed to do nothing or have no function" | Read `https://support.google.com/googleplay/android-developer/answer/14983486` 2026-09-05 |
| Hugging Face taxonomy is a closed list of 47 tasks | 47 keys returned, from `any-to-any` to `zero-shot-object-detection` | `curl https://huggingface.co/api/tasks` 2026-09-05, saved `raw/r13-hf-api-tasks-2026-09-05.json` |
| Hugging Face exposes a sortable `trendingScore` but does not publish the formula | Top 5 by trendingScore: 561 (602 likes, created 2026-08-31) ranked above 549 (13,955 likes, created 2026-08-05) | `curl "https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=5"` 2026-09-05, saved `raw/r13-hf-api-trending-2026-09-05.json` |
| Hugging Face publishes machine-readable per-file safety verdicts | `securityRepoStatus.filesWithIssues[]` with `level` values `unsafe` and `caution` | `curl "https://huggingface.co/api/models/mcpotato/42-eicar-street?securityStatus=true"` 2026-09-05, saved `raw/r13-hf-securitystatus-eicar-2026-09-05.json` |
| Hugging Face scans every file on every commit | "We run every file of your repositories through a malware scanner" (ClamAV). "Scanning is triggered at each commit." Flagged repos warn users, they are not deleted | Read `https://huggingface.co/docs/hub/en/security-malware` 2026-09-05 |
| Hugging Face list API rate limit | `ratelimit-policy: "fixed window";"api";q=500;w=300` (500 requests per 300 seconds) | Response headers from `curl -D - "https://huggingface.co/api/models?limit=1"` 2026-09-05 |
| GitHub Marketplace has no review queue at all | "listings go live immediately and aren't reviewed by GitHub as long as they meet these requirements". Dedup is name uniqueness only: "The `name` in the action's metadata file must be unique" | Read `https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace` 2026-09-05 |
| GitHub Marketplace listing gate is mechanical | Public repo, single `action.yml` or `action.yaml` at root, a tagged release, accepted developer agreement, 2FA on the owning account, one primary category plus an optional second | Same page |
| npm's squatting test is functional, not intentional | "Package names are considered squatted if the package has no genuine function." And "npm does not resolve squatting claims on demand." | Read `https://docs.npmjs.com/policies/disputes/` 2026-09-05, saved `raw/r13-npm-disputes-2026-09-05.html` |
| Fiverr's seller score is a six-area score, hidden from buyers | Six key areas. "Gigs with a higher number of orders carry more weight in the overall score. Additionally, higher-value and more recent orders may have a greater impact". "Only you, the freelancer, can see your Success core. Clients only see your overall Level." | `curl https://help.fiverr.com/api/v2/help_center/en-us/articles/21965360854673.json` 2026-09-05, article updated 2026-09-04, saved `raw/zd-fiverr-21965360854673.json` |
| Fiverr grades relative to a price peer group | "The Success score is based on your performance relative to other freelancers in your price range." | Same article |
| Fiverr levels are a hard six-metric gate with a grace period | Level 1: score 5+, rating 4.4+, response 80%, 5 orders, 3 unique clients, $400. Level 2: 7+, 4.6+, 90%, 20, 10, $2,000. Top Rated: 9+, 4.7+, 90%, 40, 20, $10,000 plus a manual evaluation. Drop below and a **30-day grace period** starts | `curl .../articles/360010560118.json` 2026-09-05, updated 2026-09-05, saved `raw/zd-fiverr-360010560118.json` |
| Fiverr excludes suspected multi-account operators from the level system entirely | "An account flagged for strong indications of suspicious activity will be excluded from the level system... such as connections to multiple accounts" | Same article |
| Upwork's Job Success Score formula | "(successful contract outcomes - negative contract outcomes) / total outcomes", computed daily over 6-, 12- and 24-month windows, best of the three displayed | `curl https://support.upwork.com/api/v2/help_center/en-us/articles/38437458199059.json` 2026-09-05, updated 2026-08-24 |
| Upwork weights by contract value and discounts bad-actor clients | "Jobs with higher earnings will have a bigger impact on your score". "If one of your clients has been previously flagged (or has been suspended for Terms of Service violations), their feedback will not count against your JSS" | `curl .../articles/211068358.json` 2026-09-05, updated 2026-09-03 |
| Upwork's paid-visibility auction is pay-your-bid, not second price | Four slots. "You'll pay the exact amount of your bid of 35 Connects, the second slot winner will pay 30 Connects, the third slot winner will pay 25 Connects, and the fourth slot winner will pay 20 Connects." | `curl .../articles/4406395531795.json` 2026-09-05, updated 2026-09-04 |
| Upwork charges the bid only on a slot win or a real interaction | Charged if in the top four at close or if the client "opens your proposal, shortlists your proposal, messages you, archives your proposal, declines your proposal, or sends you an offer" while boosted. Auction closes after **7 days or first hire** | Same article |
| Upwork runs randomised placebo auctions to measure its own ranking feature | "a very small percentage of job posts may have placebo auctions... no Connects will be taken for the boost... all proposals ranked organically". Reported effect: "Boosting your proposal can increase your chance of being hired up to 24%" | `curl .../articles/11983621573395.json` 2026-09-05, updated 2026-09-05 |
| OpenRouter's default dispatch is randomised price-weighted load balancing | Three steps: "Prioritize providers that have not seen significant outages in the last 30 seconds", then "look at the lowest-cost candidates and select one weighted by inverse square of the price", then "Use the remaining providers as fallbacks." | Read `https://openrouter.ai/docs/features/provider-routing` 2026-09-05, saved `raw/r13-openrouter-provider-routing-2026-09-05.html` |
| OpenRouter's inverse-square weighting reproduces its own worked example | At $1/$2/$3 the weights are 0.7347 / 0.1837 / 0.0816, ratio cheapest:dearest = **9.0**, matching the doc's "9x more likely" | `python3 tools/r13-reputation-math.py` |
| OpenRouter deprioritises, it does not exclude | "Endpoints that don't meet these thresholds are deprioritized (moved to the end of the list) rather than excluded entirely." Percentiles come from "a rolling 5-minute window" | Same page |
| Setting an explicit sort disables load balancing | "If you have `sort` or `order` set in your provider preferences, load balancing will be disabled." | Same page |
| Envoy's least-request is power-of-two-choices with an explicit formula | "This is also known as P2C (power of two choices)", 2 hosts sampled by default. Weighted case: `weight = load_balancing_weight / (active_requests + 1)^active_request_bias`, bias defaults to 1.0 | Read `https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers` 2026-09-05 |
| Envoy's worked example reproduces | weight 2, active 4, bias 1 gives effective weight **0.4** | `python3 tools/r13-reputation-math.py` |
| Uber replaced nearest-driver greedy with batched matching | "In the early days, a rider was immediately matched with the closest available driver." Now: "In the seconds after a rider requests a ride, we evaluate nearby drivers and riders in one batch", "It's enough time for a batch of potential rider-driver matches to accumulate", objective is "to reduce the average wait time for everyone, not just the closest pair" | Read `https://www.uber.com/gb/en/marketplace/matching/` 2026-09-05 |
| Uber blocks matches on prior one-star history | Pairings "may be altered for safety reasons, such as blocking a match where either party previously gave the other a one-star rating" | Same page |
| UniswapX Dutch decay is linear interpolation on `block.timestamp` | `decay(startAmount, endAmount, decayStartTime, decayEndTime)`; before start returns `startAmount`, after end returns `endAmount`, in between `linearDecay`. Direction is enforced: "for DutchInput, startAmount must be less than or equal to endAmount - for DutchOutput, startAmount must be greater than or equal to endAmount" | `curl https://raw.githubusercontent.com/Uniswap/UniswapX/main/src/lib/DutchDecayLib.sol` 2026-09-05, saved `raw/r13-uniswapx-DutchDecayLib.sol` |
| UniswapX gives a named filler a head start with a priced override | `exclusivityOverrideBps`, `BPS = 10_000`, `STRICT_EXCLUSIVITY = 0`. "if override is 0, then assume strict exclusivity so the order cannot be filled" before `exclusivityEnd` | `curl .../src/lib/ExclusivityLib.sol` 2026-09-05, saved `raw/r13-uniswapx-ExclusivityLib.sol` |
| Google's search ad auction is a generalised second price, stated plainly | "you only pay what's minimally required to clear the Ad Rank thresholds" and to beat "the Ad Rank of the competitor immediately below you". With nobody below, "you only pay the reserve price" | Read `https://support.google.com/google-ads/answer/6297` 2026-09-05 |
| Randomised exploration beat deterministic UCB on real ad data | CTR regret on the display advertising set: Thompson sampling 3.72%, LinUCB 4.14%, epsilon-greedy 4.98%, exploit-only 5.00%, random 31.95% | `pdftotext` of NeurIPS 2011 paper, Table 2, saved `raw/r13-thompson-chapelle-li-2011.pdf` and `.txt` |
| Contextual bandit lift over a context-free bandit, on 33M real events | "Results showed a 12.5% click lift compared to a standard context-free bandit algorithm" | `pdftotext` of arXiv:1003.0146, saved `raw/r13-linucb-1003.0146.pdf` and `.txt` |
| A production personalisation service shipped plain epsilon-greedy | "Personalizer currently uses an algorithm called *epsilon greedy* to explore." Exploration percentage is an operator dial, "A setting of zero will negate many of the benefits" | Read `https://learn.microsoft.com/en-us/azure/ai-services/personalizer/concepts-exploration` 2026-09-05 |
| Steam gates score contribution on purchase, not on writing | "Purchase is not required." to write. But "Only reviews posted from an account that has purchased on Steam and played the game will count toward the review score" and "Only purchases (not key activation) made by the reviewing account are included in the review score." | Read `https://partner.steamgames.com/doc/store/reviews` 2026-09-05 |
| Steam handles individual off-topic reviews differently from bombs | Individual: "'Off-Topic' will have their visibility reduced, but will still contribute to a product's review score". Bulk: "the abnormal period of volume will be removed from the overall score", "those reviews will not contribute to your overall score" | Same page |
| Steam has a published visibility floor tied to score | "As long as your game's reviews are Mixed or above (40%+), review score is not a factor in algorithmic visibility." Below 40% "your game will be less likely to be featured" | Same page |
| Steam splits recent from lifetime | Two figures, "one from the past 30 days, and one for the product's lifetime" | Same page |
| Steam's score bands track ratio at high volume | Measured 10 apps: 96.50% of 1,210,170 → 9 "Overwhelmingly Positive"; 89.53% of 312,230 → 8 "Very Positive"; 86.86% of 977,791 → 8 | `curl "https://store.steampowered.com/appreviews/<appid>?json=1&num_per_page=0&language=all&purchase_type=all"` 2026-09-05, saved `raw/r13-steam-review-bands-2026-09-05.txt` |
| IMDb publishes its Bayesian chart formula and refuses to publish the page one | `WR = (v / (v+m)) * R + (m / (v+m)) * C` with m = 25,000 minimum ratings and C = the report mean. Separately: "We don't use the arithmetic mean" and "we do not disclose the criteria used for an IMDb user to be counted as a regular user" | Read `https://help.imdb.com/article/imdb/track-movies-tv/faq-for-imdb-ratings/G67Y87TFYYP6TWAV` 2026-09-05, saved `raw/r13-imdb-ratings-faq-2026-09-05.html` |
| IMDb reweights suspicious voting instead of deleting it | "When unusual rating activity is detected, a different weighting calculation may be applied", while "we count and display all unaltered ratings in the rating breakdown". Display floor is five ratings | Same page |
| The Wilson lower bound in its canonical published form | `(phat + z*z/(2*n) - z*sqrt((phat*(1-phat)+z*z/(4*n))/n)) / (1+z*z/n)`, z = 1.96 for 95%, return 0 when n = 0 | Read `https://www.evanmiller.org/how-not-to-sort-by-average-rating.html` 2026-09-05, saved `raw/r13-wilson-evanmiller-2026-09-05.html` |
| Wilson punishes tiny samples hard | 2/2 perfect scores 0.3424. 5/5 scores 0.5655. 9/10 scores 0.5958. 45/50 scores 0.7864. 900/1000 at the same 90% ratio scores 0.8798 | `python3 tools/r13-reputation-math.py` |
| Airbnb's anti-reciprocity mechanism is a simultaneous reveal with a hard clock | "Both parties will have 14 days after checkout to submit their review." "Reviews are only posted after both parties have submitted their reviews, or once the 14-day period has ended". No pre-publication moderation: "Airbnb doesn't moderate reviews before they're published." | Read `https://www.airbnb.com/help/article/13/airbnbs-review-policy` 2026-09-05 |
| Airbnb bans traded reviews by name | "Reviews may not be provided or withheld in exchange for something of value" including "a reciprocal positive review". Also bans reviewing "listings with which they are directly affiliated or in direct competition" and threatening "a negative review as a means to obtain unwarranted compensation" | Read `https://www.airbnb.com/help/article/2673` 2026-09-05 |
| Airbnb's remedy ladder and clock | 72 hours **from discovery**, not from check-in: "start a request to cancel your reservation within 72 hours of finding the problem". Ladder: ask the host to fix, then partial refund, then full refund. Evidence: "Take photos or videos of the problem" | Read `https://www.airbnb.com/help/article/544` 2026-09-05 |
| eBay strips the seller's retaliation lever and automates removal | "We use automation to proactively remove feedback that goes against our policy", manual review on request, removed "within 24 hours", request window 90 days. Removable if it "Is used as a means to extort another member" or "Is used to manipulate feedback ratings" | Read `https://www.ebay.com/help/policies/feedback-policies/feedback-policies?id=4230` 2026-09-05 |
| eBay's dispute clocks, all of them | Buyer opens within **30 calendar days** of estimated or actual delivery. Seller responds within **3 business days**. Buyer escalates from 3 business days up to **21 business days**. Refund due **2 business days** after the return arrives. Appeal within **30 calendar days** of the decision | Read `https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210` 2026-09-05, saved `raw/r13-ebay-mbg-2026-09-05.html` |
| eBay's burden of proof is a closed list of machine-checkable facts | Tracking from an integrated carrier uploaded to eBay, a shipping scan before the latest estimated delivery date, status "delivered" or "attempted delivery", a delivery date, a zip match against the order, plus "Signature confirmation, on orders with a total cost of $750 or more" | Same page |
| eBay flips the burden when tracking is absent | "eBay may step in without the buyer asking if there is no valid tracking information available" | Same page |
| Upwork's escrow clock is 14 days with auto-release | "you have 14 days to review it... If you do not take action within that time, that's considered approval, and we automatically release the funds". A change request restarts it: "a new 14-day review window starts" | `curl https://support.upwork.com/api/v2/help_center/en-us/articles/17974824831507.json` 2026-09-05 |
| Upwork's escrow protection is conditioned on machine-checkable preconditions | Milestone "fully funded before you began working", delivery through the "Submit Work for Payment" button, work matching the milestone description. "If a milestone isn't funded in advance, we can't help recover payment later." | `curl .../articles/211063748.json` 2026-09-05, updated 2026-09-02 |
| Upwork's arbitration is paid, binding, third-party and defaults against the non-payer | 7 days to accept after a notice of non-resolution. Split evenly, platform contributes above $20,000 contract value. "If one party pursues and pays for arbitration and the other does not, the funds will be released to the party who did choose to participate". Non-compliance triggers suspension | `curl .../articles/14044146250259.json` 2026-09-05, updated 2026-08-28 |
| Stripe's dispute evidence schema is 30 named fields plus a clock | `access_activity_log`, `billing_address`, `cancellation_policy`, `cancellation_policy_disclosure`, `cancellation_rebuttal`, `customer_communication`, `customer_email_address`, `customer_name`, `customer_purchase_ip`, `customer_signature`, `duplicate_charge_documentation`, `duplicate_charge_explanation`, `duplicate_charge_id`, `product_description`, `receipt`, `refund_policy`, `refund_policy_disclosure`, `refund_refusal_explanation`, `service_date`, `service_documentation`, `shipping_address`, `shipping_carrier`, `shipping_date`, `shipping_documentation`, `shipping_tracking_number`, `uncategorized_file`, `uncategorized_text`. Plus `evidence_details.{due_by, has_evidence, past_due, submission_count}` | Read `https://docs.stripe.com/api/disputes/object` 2026-09-05 |
| Stripe's dispute state machine has 8 states | `warning_needs_response`, `warning_under_review`, `warning_closed`, `needs_response`, `under_review`, `won`, `lost`, `prevented` | Same page |
| Stripe treats one evidence write as a full submission | "Updating any field in the hash submits all fields in the hash for review." | Same page |
| Apple's refund process pulls structured usage evidence from the seller on a 12-hour clock | `CONSUMPTION_REQUEST` notification, then "Respond within 12 hours of receiving the `CONSUMPTION_REQUEST` notification." Required fields include `customerConsented`, `deliveryStatus`, `sampleContentProvided`; optional include `consumptionPercentage` (milliunits) and `refundPreference` | `curl https://developer.apple.com/tutorials/data/documentation/appstoreserverapi/send-consumption-information.json` and `.../consumptionrequest.json` 2026-09-05 |
| Apple requires consent before the seller may send that evidence | "You must obtain valid consent from the customer before sharing their personal data"; if consent is absent, "don't respond to the `CONSUMPTION_REQUEST` notification" | Same source |
| The DSA fixes what a takedown notice must contain | Article 16(2): substantiated explanation of illegality, "a clear indication of the exact electronic location of that information, such as the exact URL or URLs", contact details of the notifier and "a statement confirming the bona fide belief" | `curl` EUR-Lex CELEX:32022R2065 2026-09-05, saved `raw/r13-eu-dsa-2022-2065-2026-09-05.html` and extracted text |
| The DSA fixes what a takedown decision must say | Article 17(3): what the action was and its "territorial scope... and its duration", "the facts and circumstances relied on", "information on the use made of automated means", the legal or contractual ground and the redress routes. Demotion counts as a restriction under 17(1)(a), as does suspending payments under 17(1)(b) | Same source |
| The DSA fixes the appeal window at six months | Article 20(1): internal complaint handling "for a period of at least six months following the decision", free of charge, electronic. Reversal duty: where a complaint shows the decision was unfounded, "it shall reverse its decision... without undue delay" | Same source |
| The DSA makes abuse suspension symmetric | Article 23(1) suspends users who "frequently provide manifestly illegal content". Article 23(2) suspends **notifiers and complainants** who "frequently submit notices or complaints that are manifestly unfounded". Both require a prior warning and 23(3) lists the four factors to weigh | Same source |
| The DSA requires the misuse policy to be written down with examples | Article 23(4): set out the policy "in a clear and detailed manner, in their terms and conditions" and "give examples of the facts and circumstances that they take into account" | Same source |
| DMCA notice, counter-notice and restore windows | 512(c)(3)(A) six elements including the penalty-of-perjury authority statement. 512(g)(2): notify the subscriber, forward the counter-notice, restore "not less than 10, nor more than 14, business days following receipt of the counter notice" unless a court action is filed. 512(f) creates liability for knowing material misrepresentation by **either** side | `curl https://www.law.cornell.edu/uscode/text/17/512` 2026-09-05, saved `raw/r13-usc17-512-2026-09-05.html` and `-text-` |
| EU law already tells a platform what to disclose about running its own supply | P2B Regulation Article 7(1): describe "any differentiated treatment which they give, or might give" to "either that provider itself or any business users which that provider controls", with "the main economic, commercial or legal considerations". 7(3)(b) names ranking explicitly | `curl` EUR-Lex CELEX:32019R1150 2026-09-05, saved `raw/r13-eu-p2b-2019-1150-2026-09-05.html` |
| Ranking parameters must be published and paid ranking disclosed | P2B Article 5(1) requires "the main parameters determining ranking and the reasons for the relative importance of those main parameters". 5(3): where money can move ranking, describe "those possibilities and of the effects of such remuneration on ranking". 5(6) exempts disclosing algorithms that would enable manipulation | Same source |
| For designated gatekeepers, self-preferencing in ranking is banned outright | DMA Article 6(5): "The gatekeeper shall not treat more favourably, in ranking and related indexing and crawling, services and products offered by the gatekeeper itself than similar services or products of a third party." | `curl` EUR-Lex CELEX:32022R1925 2026-09-05, saved `raw/r13-eu-dma-2022-1925-2026-09-05.html` |
| A US rule now names every review-gaming pattern as an unfair practice | 16 CFR 465: §465.2 fake reviews and non-existent reviewers, §465.4 buying reviews of a given sentiment, §465.5 undisclosed insider and immediate-relative reviews, §465.6 own review sites presented as independent, §465.7 review suppression including "unfounded or groundless legal threat", §465.8 buying or selling fake follower metrics. Source note: "89 FR 68077, Aug. 22, 2024" | `curl --compressed "https://www.ecfr.gov/api/versioner/v1/full/2026-09-01/title-16.xml?part=465"` 2026-09-05, saved `raw/r13-ftc-16cfr465-2026-09-05.xml` |
| The rule also defines when filtering reviews is legitimate | §465.7(b): not suppression if criteria are "applied equally to all reviews submitted without regard to sentiment", listing confidential information, abusive content, third-party PII, discriminatory content, "clearly false or misleading" content, reasonable belief the review is fake or content "wholly unrelated" to the offering | Same source |
| On-chain wash trading has a published one-hop heuristic with a threshold | Self-financed address = one "funded either by the selling address or by the address that initially funded the selling address". Habitual = "sold an NFT to a self-financed address more than 25 times". 262 users found, 110 profitable at $8,875,315, 152 unprofitable at -$416,984 | Read `https://www.chainalysis.com/blog/2022-crypto-crime-report-preview-nft-wash-trading-money-laundering/` 2026-09-05 |
| A sybil score is available as a plain HTTP read with a pass flag | `GET https://api.passport.xyz/v2/stamps/{scorer_id}/score/{address}` with header `X-API-KEY`. Response carries `score`, `passing_score`, `threshold` ("20"), `expiration_timestamp`, plus per-credential `stamps.{id}.{score, dedup, expiration_date}`. Tier 1 limit 125 requests per 15 minutes, 60-second timeout | Read `https://docs.passport.human.tech/building-with-passport/passport-api/api-reference` 2026-09-05 |
| Amazon's stated response to a suspected fake review is suppression | "we suppress the review completely, so it is not displayed", detected by "machine learning models analyze thousands of data points" plus "expert investigators". Seller-side: "100% of new sellers are required to complete Amazon's robust verification process" | Read `https://trustworthyshopping.aboutamazon.com/approach/robust-proactive-controls` 2026-09-05 |

## Unverified or open

Everything here is either blocked or unpublished. None of it should be stated as settled and no design
decision should rest on it alone.

| Claim | What blocked it |
| --- | --- |
| Amazon's exact star-rating method (whether recency and verified-purchase status are ML-weighted rather than plain-averaged) | `amazon.com/gp/help/customer/display.html` returned 503 to WebFetch and served a "We can't find the page" body to curl for three different node ids. Amazon's own trust page is qualitative only |
| The exact wording of Amazon's "Amazon Verified Purchase" definition | Same block |
| Hugging Face's `trendingScore` formula | Not documented anywhere I could find. The field is live and sortable, the algorithm is not published. My recency inference is from two data points, not from a spec |
| IMDb's title-page weighted-average formula | IMDb states it exists and declines to publish it. Only the Top 250 chart formula is public |
| Valve's own wording on off-topic review bombs | `steamcommunity.com` and `store.steampowered.com` news pages served navigation chrome only. The Wayback snapshot fetched but the announcement body did not render. The mechanism is confirmed from the Steamworks partner docs I did read and from search-index snippets quoting Valve, so treat the mechanism as verified and the exact 2019 announcement wording as unverified |
| Steam's per-band minimum review counts (for example "500+ reviews for Overwhelmingly Positive") | Not in the Steamworks doc. My 10-app sample was all high volume, so it separates the bands on ratio but cannot isolate a count threshold |
| Google Play's per-app spam enforcement consequences | The Spam article links to a separate Enforcement topic I did not fetch |
| GPT Store category list, builder verification requirements and ranking | `help.openai.com` and `openai.com/policies` both returned 403 to WebFetch and to curl with two user agents |
| Fiverr's per-area weights inside the Success score | Fiverr names the six areas and says higher-value and more recent orders matter more. It does not publish weights |
| Upwork's private-feedback treatment | One search snippet says private feedback is no longer collected. The two help articles I fetched do not say so. Unresolved |
| Connection-Oriented Cluster Match, the sybil-resistant funding formula | Both the blog URL and the forum thread 404'd. The Passport score API is verified, the cluster-match formula is not |
| Netflix artwork bandit details | `netflixtechblog.com` returned 403 |
| DoorDash dispatch internals | `careersatdoordash.com` returned 403. A search snippet says the prior system was bipartite matching solved with the Hungarian algorithm. Not verified from the page |
| Uber's batching window length in seconds | Uber describes it as "the seconds after" and "just a few seconds". No number is published |
| PayPal and card-network dispute day counts | The PayPal purchase-protection URL 404'd. The full user agreement saved but I did not extract the timelines from it. Use eBay, Upwork, Stripe and Apple for clocks instead |
| Whether any operator publicly labels first-party listings inside its own marketplace catalogue | GitHub Marketplace does not mark GitHub-authored actions differently, per its own docs. I found the legal obligation to disclose (P2B Article 7) but no operator page showing the label in practice |

## Interfaces and constants

Everything in this section is copy-paste material. Formulas are runnable, all of them are exercised by
`tools/r13-reputation-math.py` in this repo.

### 1. Categorisation and browse when the catalogue is huge and mostly junk

**The taxonomy is a closed list and it is short.** Hugging Face indexes millions of models under
exactly 47 `pipeline_tag` values. Apple runs about two dozen categories with one primary plus one
secondary and allows subcategories only for Games. Neither lets a lister invent a category. The
closed list is the whole trick: it makes browse pages finite, it makes facet counts cheap and it
makes "this listing is in the wrong place" a reviewable claim rather than an opinion.

Hugging Face's 47 task ids, verbatim from `GET https://huggingface.co/api/tasks`:

```
any-to-any, audio-classification, audio-text-to-text, audio-to-audio,
automatic-speech-recognition, depth-estimation, document-question-answering,
feature-extraction, fill-mask, image-classification, image-feature-extraction,
image-segmentation, image-text-to-image, image-text-to-text, image-text-to-video,
image-to-3d, image-to-image, image-to-text, image-to-video, keypoint-detection,
mask-generation, object-detection, question-answering, reinforcement-learning,
sentence-similarity, summarization, table-question-answering, tabular-classification,
tabular-regression, text-classification, text-generation, text-ranking, text-to-3d,
text-to-image, text-to-speech, text-to-video, token-classification, translation,
unconditional-image-generation, video-classification, video-text-to-text,
video-to-video, visual-document-retrieval, visual-question-answering,
zero-shot-classification, zero-shot-image-classification, zero-shot-object-detection
```

Each task object carries `id`, `label`, `summary`, `libraries`, `metrics`, plus curated `models`,
`datasets`, `spaces` and `widgetModels` arrays with one-line descriptions. That is the pattern worth
stealing: **the category is a document, not a string.** It ships its own definition, its own metric
list and a handful of hand-picked exemplars. Apple does the identical thing in prose. Its Business
category reads "Apps that assist with running a business or provide a means to collaborate, edit, or
share content" followed by "For example: document management (PDFs, scanning, file viewing/editing),
VoIP telephony, dictation, remote desktop...". A lister who reads that knows where to file. A reviewer
who reads it can say no.

**Duplicates and spam get three separate rules, not one.** The operators that hold a big catalogue
together all split the problem the same way:

1. Same lister, many near-identical listings. Apple 4.3(a) bans "multiple Bundle IDs of the same app",
   with the city-map example. Google Play's Repetitive Content rule bans "Creating multiple apps with
   highly similar functionality, content, and user experience" and pushes the lister toward "a single
   app that aggregates all the content".
2. Different listers, indistinguishable output. Apple 4.3(b) names the saturated categories and
   refuses new entries "unless they offer a meaningfully different or improved experience". Google:
   "We don't allow apps that merely provide the same experience as other apps already on Google Play."
3. Listing with no function at all. Play's Limited Functionality rule bans "Apps that are designed to
   do nothing or have no function". npm's squatting test is the sharpest version: "Package names are
   considered squatted if the package has no genuine function." Apple 4.2 is the same idea aimed at
   thin wrappers: an app must "elevate it beyond a repackaged website".

Rule 3 is the only one of the three a machine can decide and it is the one that matters for a
catalogue of 287,029 registered agents where two publish a callable endpoint. **The functional test is
the gate.** Everything else is appeals work.

**Nobody reviews listings by hand at scale.** GitHub Marketplace is the honest limit case: listings
"go live immediately and aren't reviewed by GitHub as long as they meet these requirements", where the
requirements are entirely mechanical (public repo, one `action.yml` at root, a tagged release, an
accepted agreement, 2FA, one primary category). Deduplication is a unique-name constraint and nothing
more. That is the design an agent marketplace should copy for the fast path, with a second tier of
signal layered on top rather than a review queue in front.

**The second tier is a machine-readable safety verdict attached to the listing.** Hugging Face runs
ClamAV over every file on every commit and exposes the result as a field:

```bash
curl "https://huggingface.co/api/models/mcpotato/42-eicar-street?securityStatus=true"
```

```json
{
  "securityRepoStatus": {
    "scansDone": true,
    "filesWithIssues": [
      { "path": "model_broken_X.pkl", "level": "unsafe" },
      { "path": "danger.dat",         "level": "unsafe" },
      { "path": "build_pickles.py",   "level": "caution" },
      { "path": "eicar_test_file",    "level": "unsafe" }
    ]
  }
}
```

Two properties to copy. The verdict is per-file with a three-way level (`unsafe`, `caution`, implicit
ok), not a repo-wide boolean. And a bad verdict warns rather than deletes: the docs say only that "a
message will warn the users" and advise the owner to remove the file, after which "The repository will
appear back as safe." A listing with an `unsafe` badge is more useful to a browsing buyer than a
listing that silently vanished.

**Ranking is where the junk actually gets buried and the honest operators publish the shape while
withholding the weights.** Steam publishes a hard floor: "As long as your game's reviews are Mixed or
above (40%+), review score is not a factor in algorithmic visibility" and below 40% "your game will be
less likely to be featured". Fiverr publishes the six inputs and the level thresholds, hides the
weights and shows buyers only the coarse Level badge. IMDb publishes the chart formula and refuses to
publish the page one. Hugging Face exposes `trendingScore` as a sort key with no formula.

This is not evasiveness, it is the position EU law explicitly carves out. P2B Article 5(1) requires
"the main parameters determining ranking and the reasons for the relative importance of those main
parameters". Article 5(6) then says providers are "not required to disclose algorithms or any
information that, with reasonable certainty, would result in the enabling of deception of consumers or
consumer harm through the manipulation of search results". **Publish the parameter list, publish the
thresholds, withhold the coefficients.** Article 5(3) adds the part most marketplaces skip: if money
can move ranking, you must describe "those possibilities and of the effects of such remuneration on
ranking".

**Facet design copied straight from OpenRouter**, which is the closest live analogue to an agent
marketplace because its suppliers are interchangeable machines with prices and latencies:

| Facet | Field | Values |
| --- | --- | --- |
| Hard include list | `provider.only` | slugs, bare slug matches all endpoints of a provider |
| Hard exclude list | `provider.ignore` | same |
| Pinned order | `provider.order` | ordered slugs |
| Fail closed | `provider.allow_fallbacks` | `false` restricts to the chosen list |
| Capability filter | `provider.require_parameters` | `true` drops providers missing a requested parameter |
| Policy filter | `provider.data_collection` | `"allow"` (default) or `"deny"` |
| Price ceiling | `provider.max_price` | `{prompt, completion, request, image}`, blocks the request if unmet |
| Soft performance floor | `preferred_min_throughput`, `preferred_max_latency` | `{p50|p75|p90|p99: n}`, deprioritises, never guarantees |
| Sort | `provider.sort` | `"price"`, `"throughput"`, `"latency"` or `{by, partition}` |

Note the split between hard and soft constraints. `max_price` "will prevent your request from running
if the price is not available", while the throughput and latency preferences "do *not* guarantee" a
match. An agent marketplace needs exactly this distinction: a spend cap is a hard constraint, a
success-rate target is a preference.

### 2. Reputation that resists gaming, with the formulas

**Gate on the transaction, not on the account.** This is the one mechanism every serious operator
shares and it is cheap.

| Operator | The gate |
| --- | --- |
| Steam | "Only reviews posted from an account that has purchased on Steam and played the game will count toward the review score" and "Only purchases (not key activation)". Anyone may still write one: "Purchase is not required." |
| Airbnb | "Reviews are fake if they aren't based on a real reservation." "Reviews must be submitted by or on behalf of someone who participated in the reservation." |
| Upwork | Score is built from "contract outcomes" and unfunded work is outside protection entirely |
| eBay | Feedback attaches to a transaction, removable when "The order was canceled because the buyer didn't pay" |
| Fiverr | Score is built from order history in six areas, so an account with no orders has no score |

Steam's split is the smart version and the one to copy: **let anyone comment, count only buyers.** The
comment layer keeps the page useful. The scored layer keeps the number honest. On-chain this is free,
because a payment is the primitive.

**Shrink toward a prior until the evidence arrives.** Two published formulas, both usable.

IMDb's Bayesian weighted rating, verbatim from its help page:

```
weighted rating (WR) = (v / (v + m)) * R + (m / (v + m)) * C

R = the arithmetic mean rating for this title
v = number of ratings for this title
m = minimum ratings required to be listed (IMDb uses 25,000 for the Top 250)
C = the mean rating across the whole report
```

Tuned for an agent marketplace with a job-success prior of 0.80 and m = 20 jobs, from
`tools/r13-reputation-math.py`:

| Observed success | Jobs | Shrunk score |
| --- | --- | --- |
| 100% | 1 | 0.8095 |
| 100% | 5 | 0.8400 |
| 100% | 20 | 0.9000 |
| 100% | 200 | 0.9818 |
| 60% | 200 | 0.6182 |

A brand-new agent with one perfect job scores 0.8095, barely above the prior. Twenty perfect jobs earns
0.9000. That kills the single-fake-review attack without any fraud detection at all.

The Wilson score lower bound is the frequentist alternative and needs no prior. Verbatim from the
canonical published implementation:

```python
# lower bound of the Wilson score interval for a Bernoulli parameter
# z = 1.96 for a 95 percent confidence level; return 0 when n == 0
def wilson_lower(pos, n, z=1.96):
    if n == 0:
        return 0.0
    p = pos / n
    return (p + z*z/(2*n) - z*math.sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)
```

Precomputed constants from the same source, for a SQL version: `z**2/2 = 1.9208`, `z**2/4 = 0.9604`,
`z**2 = 3.8416`. Measured behaviour:

| pos/n | ratio | Wilson lower |
| --- | --- | --- |
| 2/2 | 1.0000 | 0.3424 |
| 5/5 | 1.0000 | 0.5655 |
| 9/10 | 0.9000 | 0.5958 |
| 45/50 | 0.9000 | 0.7864 |
| 90/100 | 0.9000 | 0.8256 |
| 900/1000 | 0.9000 | 0.8798 |
| 100/101 | 0.9901 | 0.9460 |

Pick between them on one question: do you have a defensible prior? A four-category agent marketplace
does, because the category defines the expected success rate. Use the Bayesian shrink for the headline
score and Wilson when you want a "worst case we are 95% sure of" number for a risk gate.

The Laplace rule, `(s + 1) / (s + f + 2)`, is the same idea with Beta(1,1) and no tuning. 1/0 gives
0.6667. 0/1 gives 0.3333. It is one line and it is enough for a first cut.

**Time decay with an explicit half life, combined with size weighting in one pass.** Upwork weights by
money ("Jobs with higher earnings will have a bigger impact on your score") and by recency (best of the
6-, 12- and 24-month windows). Fiverr says "higher-value and more recent orders may have a greater
impact". Steam splits recent from lifetime rather than blending. The blended version, verified running:

```python
lam = math.log(2) / half_life_days
score = sum(v * w * math.exp(-lam * age_days)) / sum(w * math.exp(-lam * age_days))
```

With a 30-day half life, two $500 successes at 1 and 5 days old against one $20,000 failure at 2 days
old gives 0.0466. Move that same failure to 400 days old and the score goes to 0.9979. The big recent
failure dominates, the old one is nearly gone. Both numbers are from the script.

Two rules that keep decay honest. Upwork: "not having them does not count against you" (about long
relationships), so absence of evidence must not be punished, only lack of positive weight. Fiverr:
"your Success score does not decrease simply due to inactivity". A decayed score must converge back to
the prior when activity stops, never to zero.

**Reviewer reputation, done as a discount rather than a network computation.** Nobody in this sample
runs PageRank over reviewers. They run a blocklist with a discount:

- Upwork: "We track freelancer feedback of clients and flag clients with a history of poor
  collaboration. If one of your clients has been previously flagged (or has been suspended for Terms of
  Service violations), their feedback will not count against your JSS."
- IMDb: "Only ratings from regular IMDb users... are considered" for charts and "the weight assigned to
  ratings given by certain users has changed".
- Steam: reviews from key activations never count.

That is the cheap version and it is the one to build: a `counterparty_trusted` boolean plus a weight
multiplier, not a trust graph.

**The named attacks and the specific defence each operator uses.**

| Attack | Named defence | Operator |
| --- | --- | --- |
| Reciprocal review ring | Simultaneous double-blind reveal on a 14-day clock. "Reviews are only posted after both parties have submitted their reviews, or once the 14-day period has ended" | Airbnb |
| Traded reviews for value | Explicit ban naming the trade: "Reviews may not be provided or withheld in exchange for something of value" including "a reciprocal positive review" | Airbnb |
| Review extortion | Ban plus removal: sellers "may not threaten a negative review as a means to obtain unwarranted compensation". eBay removes feedback that "Is used as a means to extort another member" | Airbnb, eBay |
| Self-review by the operator or its staff | 16 CFR 465.5 requires clear and conspicuous disclosure of an officer's, manager's, employee's or immediate relative's material relationship and 465.5(c) bans soliciting undisclosed reviews from relatives and staff | FTC rule |
| Own review site posing as independent | 16 CFR 465.6 bans misrepresenting that a controlled site "provides independent reviews" | FTC rule |
| Suppressing bad reviews quietly | 16 CFR 465.7(b) bans implying displayed reviews are all of them when negative ones are withheld and enumerates the sentiment-neutral filters that stay legal | FTC rule |
| Legal threats to scrub reviews | 16 CFR 465.7(a) covers "unfounded or groundless legal threat, a physical threat, intimidation" | FTC rule |
| Review bombing | Detect the anomalous window, mark it, exclude it from the score, keep the reviews readable. Individual off-topic flags reduce visibility but still count. Bulk windows are "removed from the overall score" | Steam |
| Sybil raters | Reweight rather than delete. "When unusual rating activity is detected, a different weighting calculation may be applied", while "we count and display all unaltered ratings" | IMDb |
| Multi-account operators | Exclusion from the whole progression system: an account with "connections to multiple accounts" is "excluded from the level system" | Fiverr |
| Bought engagement metrics | 16 CFR 465.8 bans buying or selling "fake indicators of social media influence", defined to include bot-generated and hijacked-account metrics | FTC rule |
| Retaliation by the counterparty | Narrow, defined retaliation test plus removal. Retaliation only counts where "the reviewer committed a policy violation, was notified of that violation" and then posted | Airbnb |

**Wash trading, which is the on-chain version of the fake review and the one that actually threatens an
agent marketplace paid over x402.** The published heuristic is one hop of funding provenance plus a
count threshold:

```
self_financed(buyer, seller) :=
      funder(buyer) == seller
   OR funder(buyer) == funder(seller)

habitual_wash_trader(seller) := count(sales where self_financed(buyer, seller)) > 25
```

Verbatim: a self-financed address is one "funded either by the selling address or by the address that
initially funded the selling address" and the threshold "gives us a higher degree of confidence that
these users are habitual wash traders". Published result on Ethereum and Wrapped Ether only: 262 users,
110 profitable at $8,875,315 total, 152 unprofitable at -$416,984 total, net $8,458,331. The most
prolific single address made 830 sales to addresses it had funded and lost money doing it.

For a marketplace where an agent pays an agent, the same query is cheaper than it is for NFTs, because
both sides of every job are addresses you already index. The rule to publish: **feedback from a
counterparty in the payer's own funding cluster is recorded but carries zero weight.** Record it,
because deleting it looks like suppression under 16 CFR 465.7(b). Weight it zero, because it is not
evidence.

**Sybil resistance as an HTTP call rather than a research project.** A live scored humanity check:

```bash
curl --request GET \
  --url https://api.passport.xyz/v2/stamps/{scorer_id}/score/{address} \
  --header 'X-API-KEY: <key>'
```

```json
{
  "address": "0x...",
  "score": "23.41",
  "passing_score": true,
  "last_score_timestamp": "2026-09-05T00:00:00.000Z",
  "expiration_timestamp": "2026-12-04T00:00:00.000Z",
  "threshold": "20",
  "error": null,
  "stamps": {
    "Ens":              { "score": "2.2", "dedup": false, "expiration_date": "..." },
    "ETHDaysActive#50": { "score": "2.1", "dedup": false, "expiration_date": "..." },
    "ETHGasSpent#0.25": { "score": "1.5", "dedup": false, "expiration_date": "..." }
  }
}
```

Three fields matter for a build. `passing_score` means the caller never reimplements the threshold.
`threshold` is returned so the UI can explain the bar. `dedup` per stamp is the sybil signal: a
credential already claimed by another address. Companion endpoints are
`GET /v2/stamps/{address}` (with `include_metadata`, `limit`, `token` for pagination) and
`GET /v2/stamps/metadata`. Rate limit tier 1 is 125 requests per 15 minutes with a 60-second timeout,
which is fine for listing-time checks and too slow for per-request checks. Cache the verdict.

### 3. Job assignment when many suppliers qualify

Six named mechanisms, each with a production operator and the trade-off that decides it.

**Ranked dispatch, greedy on one metric.** Uber's original: "In the early days, a rider was immediately
matched with the closest available driver." Uber's own verdict on it: "It worked well for most riders
but sometimes led to long wait times for others" and "closest doesn't always mean quickest". Cheapest to
build, worst tail latency, starves everyone except the top-ranked supplier. Use it as the fallback when
only one supplier qualifies.

**Batched matching over a short window.** Uber's replacement: "In the seconds after a rider requests a
ride, we evaluate nearby drivers and riders in one batch", "It's enough time for a batch of potential
rider-driver matches to accumulate", optimising "to reduce the average wait time for everyone, not just
the closest pair". Trade-off is explicit and paid in latency: you deliberately wait to get a better
global assignment. For an agent marketplace this only pays when jobs arrive faster than they complete.
Under light load a batch of one is a greedy match with extra delay.

Uber also ships an exclusion rule worth copying verbatim in spirit: a pairing is blocked "where either
party previously gave the other a one-star rating". A hard blocklist keyed on prior bad outcomes is one
table and it prevents the worst repeat matches.

**Sealed-bid auction, second price (generalised).** Google's search auction, in Google's own words:
"you only pay what's minimally required to clear the Ad Rank thresholds" and to beat "the Ad Rank of the
competitor immediately below you" and with nobody eligible below, "you only pay the reserve price".
Google's worked example uses Ad Ranks 80, 50, 30, 10, 5 with a threshold of 40 above the results and 8
below and rounds up to "the nearest billable unit, which in the U.S. is $0.01". Trade-off: truthful
bidding is a dominant strategy in the single-slot case, which is the whole reason to prefer it, but the
multi-slot generalised version is not truthful and bidders do shade. Reserve prices are load-bearing.

**Pay-your-bid multi-slot auction.** Upwork's Boosted Proposals and this is the correction to the
common belief that it is Vickrey. Four slots, each winner pays their own bid: "You'll pay the exact
amount of your bid of 35 Connects, the second slot winner will pay 30 Connects, the third slot winner
will pay 25 Connects, and the fourth slot winner will pay 20 Connects." Two refinements worth stealing.
The charge only lands on a real outcome: you pay if you hold a slot at close or if the buyer "opens
your proposal, shortlists your proposal, messages you, archives your proposal, declines your proposal,
or sends you an offer" while boosted. And the auction has a hard end: "closed after seven days or upon
first hire, whichever comes first". Trade-off: simpler to implement than second price, invites bid
shading and constant re-bidding, needs the interaction condition to stop suppliers paying for nothing.

**Dutch auction with linear decay.** UniswapX, in Solidity, is the cleanest reference implementation:

```solidity
struct DutchOrder {
    OrderInfo info;
    uint256 decayStartTime;   // when outputs start decaying
    uint256 decayEndTime;     // when price becomes static
    DutchInput input;
    DutchOutput[] outputs;
}
// DutchOutput(address token, uint256 startAmount, uint256 endAmount, address recipient)
```

```solidity
function decay(uint256 startAmount, uint256 endAmount, uint256 decayStartTime, uint256 decayEndTime)
    internal view returns (uint256 decayedAmount)
{
    if (startAmount == endAmount)              return startAmount;
    else if (decayEndTime <= decayStartTime)   revert EndTimeBeforeStartTime();
    else if (decayEndTime <= block.timestamp)  decayedAmount = endAmount;
    else if (decayStartTime >= block.timestamp) decayedAmount = startAmount;
    else decayedAmount = linearDecay(decayStartTime, decayEndTime, block.timestamp, startAmount, endAmount);
}
```

Direction is enforced by the library, not by convention: "for DutchInput, startAmount must be less than
or equal to endAmount" and "for DutchOutput, startAmount must be greater than or equal to endAmount",
otherwise `IncorrectAmounts()`. The EIP-712 type strings are in the same file, so the off-chain signing
shape is fixed:

```
DutchOrder(OrderInfo info,uint256 decayStartTime,uint256 decayEndTime,...)
DutchOutput(address token,uint256 startAmount,uint256 endAmount,address recipient)
```

The exclusivity layer is the part most people miss and the part an agent marketplace needs, because it
is how you give a preferred supplier first refusal without locking others out:

```solidity
uint256 private constant STRICT_EXCLUSIVITY = 0;
uint256 private constant BPS = 10_000;
// if the filler has fill right, proceed as-is
// if exclusivityOverrideBps == 0, strict exclusivity: revert NoExclusiveOverride()
// otherwise a non-exclusive filler must improve the price by exclusivityOverrideBps
```

Trade-off: a Dutch auction needs no bid collection and no auctioneer, price discovery is automatic
and the buyer's worst case is bounded by `endAmount`. The cost is latency proportional to the decay window,
plus the fact that the winner is whoever is fastest rather than whoever is best. Pair it with an
eligibility filter or you will hand every job to the same low-quality fast responder.

**Round robin and least-outstanding, with the exact production formula.** Envoy's weighted least-request
is the one to copy because it degrades gracefully:

```
effective_weight = load_balancing_weight / (active_requests + 1) ** active_request_bias
```

`active_request_bias` "defaults to 1.0" and "must be greater than or equal to 0.0". At 0 the policy
"behaves like the round robin load balancer and ignores the active request count". Their worked example,
which reproduces exactly in the script: weight 2 with 4 active requests gives 2 / 5 = 0.4.

Equal-weight hosts get power of two choices instead: "An O(1) algorithm which selects N random available
hosts as specified in the configuration (2 by default)" then "picks the host which has the fewest active
requests". Named in the doc as "P2C (power of two choices)", justified as "nearly as good as an O(N) full
scan", with the property that gives "resistance to herding behavior". The documented trade-off between
the two: the weighted schedule "provides good balance at steady state but may not adapt to load imbalance
as quickly" and unlike P2C "a host will never truly drain". Envoy's note on plain random is a useful
warning about round robin: random "generally performs better than round robin if no health checking
policy is configured" because it "avoids bias towards the host in the set that comes after a failed host".

**Multi-armed bandit with an exploration budget.** OpenRouter's default routing is the production shape
for a supplier marketplace and it is a weighted-random policy rather than a bandit proper:

1. "Prioritize providers that have not seen significant outages in the last 30 seconds."
2. "look at the lowest-cost candidates and select one weighted by inverse square of the price"
3. "Use the remaining providers as fallbacks."

```python
weights = [1.0/(p*p) for p in prices]; weights = [w/sum(weights) for w in weights]
# prices $1 / $2 / $3  ->  0.7347 / 0.1837 / 0.0816, ratio cheapest:dearest = 9.0
```

That 9.0 is exactly the "9x more likely" the doc claims, which is a useful check that the reading is
right. The three properties to copy: **outage memory is short (30 seconds), failure demotes rather than
excludes, performance measurement uses a rolling 5-minute percentile window.** Verbatim: "Endpoints that
don't meet these thresholds are deprioritized (moved to the end of the list) rather than excluded
entirely."

For the real bandit algorithms, the published production comparison on display advertising data settles
the choice. CTR regret, lower is better:

| Policy | Best parameter | CTR regret |
| --- | --- | --- |
| Thompson sampling | 0.5 | **3.72%** |
| LinUCB | 2 | 4.14% |
| epsilon-greedy | 0.01 | 4.98% |
| exploit-only | n/a | 5.00% |
| random | n/a | 31.95% |

Thompson sampling for the Bernoulli case, verbatim pseudocode:

```
Require: alpha, beta prior parameters of a Beta distribution
  S_i = 0, F_i = 0 for all i          # success and failure counters
  for t = 1..T:
      for i = 1..K:
          draw theta_i ~ Beta(S_i + alpha, F_i + beta)
      pick arm argmax_i theta_i, observe reward r
      if r == 1: S_i += 1 else: F_i += 1
```

That is about ten lines of code and it beat everything else on real data. The paper also gives the reason
it fits a marketplace specifically: rewards arrive late and "Thompson sampling alleviates the influence
of delayed feedback by randomizing over actions; on the other hand, UCB is deterministic and suffers a
larger regret in case of a sub-optimal choice." An agent job that takes minutes to settle is exactly the
delayed-feedback case.

LinUCB, if you want context (category, size, urgency) in the decision:

```
p_{t,a} = theta_hat_a' x_{t,a} + alpha * sqrt( x_{t,a}' A_a^{-1} x_{t,a} )
theta_hat_a = A_a^{-1} b_a,   A_a starts at I_d,   b_a starts at 0_d
after observing reward r:  A_a += x_{t,a} x_{t,a}',   b_a += r * x_{t,a}
alpha = 1 + sqrt( ln(2/delta) / 2 )      # delta 0.05 -> 2.3581
```

The paper flags that this alpha "may be conservatively large in some applications, and so optimizing this
parameter may result in higher total payoffs in practice", which matches the empirical table where
LinUCB's best alpha was 2. Reported gain: "a 12.5% click lift compared to a standard context-free bandit
algorithm" over 33 million events, "and the advantage becomes even greater when data gets more scarce".
That last clause is the argument for using a bandit on a cold catalogue.

The simplest production option remains defensible. A shipped commercial personalisation service used
plain epsilon-greedy: "Personalizer currently uses an algorithm called *epsilon greedy* to explore",
with the exploration percentage as an operator dial and two warnings. Zero exploration "leads to model
stagnation, drift, and ultimately lower performance". 100% means "any learned behavior from users would
not influence the outcome". And one design rule that is easy to get wrong: "It is important not to change
the application behavior based on whether you see if Personalizer is exploring or using the learned best
action. This would lead to learning biases."

**Shortest expected wait.** This is P2C with the metric changed from active requests to predicted
completion time. No operator in this sample publishes a queueing formula, so treat the M/M/c wait
estimate as unverified prior art and use the measured version instead: keep a rolling p50 and p90 of
observed job latency per supplier, exactly as OpenRouter does over a 5-minute window, then sort or filter
on it. `preferred_max_latency: {p90: n}` is the interface.

**How to measure whether your own ranking works, which nobody else in this list bothers to publish.**
Upwork runs a **randomised holdout on its own ranking feature**: "a very small percentage of job posts
may have placebo auctions", where the freelancer bids as normal, "no Connects will be taken for the
boost", the client still receives every proposal, "The proposals will just all be ranked organically",
and no boosted label is shown. Assignment is "entirely random and not impacted by a client's spend, job
post characteristics". The freelancer only learns afterwards. That design yields the causal number they
publish: "Boosting your proposal can increase your chance of being hired up to 24%." Any marketplace
that claims its matching helps should be able to produce that number the same way.

### 4. Escrow and dispute resolution

**Every clock in one table, from the four operators that publish theirs.** Copy the structure, not the
durations, because agent jobs settle in seconds rather than in shipping days.

| Step | eBay | Upwork fixed-price | Airbnb | Apple |
| --- | --- | --- | --- | --- |
| Funds held before work | no | yes, milestone must be "fully funded before you began working" | payment held | in-app purchase captured |
| Buyer opens | within 30 calendar days of estimated or actual delivery | any time funds are held | within 72 hours **of discovering** the problem | customer files a refund request |
| Supplier responds | 3 business days | 7 days to accept arbitration after non-resolution | host asked first, no published deadline | 12 hours to send consumption data |
| Auto-resolve if silent | eBay steps in and may act unasked "if there is no valid tracking information available" | 14 days of client silence = approval, funds auto-release | escalate to the platform | Apple decides without the seller's input |
| Escalation window | from 3 up to 21 business days | dispute assistance, then mediation, then arbitration | platform steps in | none |
| Refund execution | 2 business days after the return arrives | on arbitrator decision | to original payment method | Apple issues |
| Appeal | 30 calendar days from the decision, may require "additional documentation" | arbitration is binding, non-compliance suspends the account | review dispute submission | none published |

Three structural moves inside that table are the ones that make an agent marketplace work.

**Auto-release on silence, with the clock restarting on a change request.** Upwork: "you have 14 days to
review it... If you do not take action within that time, that's considered approval, and we automatically
release the funds" and on a change request "a new 14-day review window starts". Without auto-release,
escrow becomes a hostage mechanism. With it, the default outcome is payment and the buyer must act to
stop it. For sub-minute agent jobs the same shape works with the constant swapped: a short review window,
auto-release on expiry, one restart per change request, then dispute.

**Preconditions that a machine can check, published in advance.** Upwork's protection applies only if the
milestone was funded first, the work went through the platform's submit flow and the deliverable matches
the milestone description. The blunt consequence is published: "If a milestone isn't funded in advance, we
can't help recover payment later." eBay's version is a list of facts a computer can verify: carrier
tracking uploaded to eBay, a scan before the latest estimated delivery date, a status of "delivered" or
"attempted delivery", a zip match against the order record and signature confirmation on orders of $750
or more. **The lesson is that a defensible decision comes from a checklist written before the dispute, not
from judgement applied after it.**

**A structured evidence schema with a hard deadline and a submission counter.** Stripe's is the schema to
copy wholesale. The 30 evidence fields split cleanly into six groups a marketplace can map onto agent work:

| Group | Stripe fields | Agent-marketplace equivalent |
| --- | --- | --- |
| Was it delivered | `service_documentation`, `shipping_documentation`, `shipping_carrier`, `shipping_date`, `shipping_tracking_number`, `service_date` | signed job result, output hash, settlement tx hash, timestamps |
| Was it used | `access_activity_log` | invocation log, tokens consumed, on-chain calls made |
| What was promised | `product_description` | the listing's declared capability contract |
| What the rules were | `refund_policy`, `refund_policy_disclosure`, `cancellation_policy`, `cancellation_policy_disclosure` | published marketplace rulebook version at job time |
| What was said | `customer_communication`, `customer_email_address`, `customer_name`, `customer_purchase_ip`, `customer_signature`, `billing_address`, `shipping_address` | request payload, signature, caller address |
| Rebuttal | `cancellation_rebuttal`, `refund_refusal_explanation`, `duplicate_charge_explanation`, `duplicate_charge_id`, `duplicate_charge_documentation`, `receipt`, `uncategorized_file`, `uncategorized_text` | free-form supplier response |

The wrapper is as important as the fields:

```json
{
  "evidence_details": { "due_by": 1682294399, "has_evidence": false, "past_due": false, "submission_count": 0 },
  "status": "needs_response"
}
```

`due_by` is a unix timestamp, `submission_count` is a counter and one write submits everything:
"Updating any field in the hash submits all fields in the hash for review." The state machine has eight
values and the pre-dispute `warning_*` states are the interesting part because they let the platform
intervene before a formal dispute exists:

```
warning_needs_response -> warning_under_review -> warning_closed
needs_response -> under_review -> won | lost
prevented
```

`prevented` means "A dispute that was prevented from becoming a formal chargeback". A marketplace that can
refund automatically before a dispute opens should have that state.

**Structured self-reported usage evidence, on a very short clock.** Apple's is the most transferable design
for agent work, because it asks the supplier for quantitative consumption data rather than prose. On a
refund request the platform sends `CONSUMPTION_REQUEST`, then "Respond within 12 hours". The required fields
are `customerConsented`, `deliveryStatus`, `sampleContentProvided`. Optional ones include
`consumptionPercentage` ("the percentage of the In-App Purchase the customer consumed, in milliunits") and
`refundPreference` ("your preference, based on your operational logic, as to whether the App Store should
grant the refund"). The endpoint is a PUT keyed by transaction id and the consent rule is absolute: "You
must obtain valid consent from the customer before sharing their personal data" and without it "don't
respond to the `CONSUMPTION_REQUEST` notification".

For an agent marketplace the equivalent is a signed usage attestation: fraction of the job completed, whether
a sample or dry run was offered first, whether the output was fetched and the supplier's stated preference.
Bucketed values rather than raw ones, exactly as Apple does, keeps it privacy-safe.

**Paid binding arbitration as the terminal step, with a default that punishes non-participation.** Upwork:
funds held gets free dispute assistance first, then arbitration. Cost is split evenly, the platform pays a
share above $20,000 of contract value and there are 7 days to accept and pay. The two defaults are the
mechanism:

- "If both parties decline arbitration after rejecting the resolution in dispute assistance, the funds will
  be released to the client"
- "If one party pursues and pays for arbitration and the other does not, the funds will be released to the
  party who did choose to participate in and pay for arbitration"

Plus enforcement: "Failure to comply with the outcome reached through arbitration will result in an account
entity (AE) suspension". A binding decision needs teeth that do not require a court.

**What makes a decision defensible, assembled from the sources.** The DSA writes this down as law, so it is
the cleanest available checklist. Article 17(3) requires the decision to state the action taken plus "the
territorial scope of the decision and its duration", "the facts and circumstances relied on in taking the
decision", "information on the use made of automated means in taking the decision", the legal or contractual
ground with an explanation of why it applies and "clear and user-friendly information on the possibilities
for redress". Article 17(1) sweeps in demotion (17(1)(a)) and payment suspension (17(1)(b)), so a
shadow-demotion is a decision that owes reasons too.

The seven-point version, each point traceable to a source above:

1. The rule existed and was published before the job ran. Version it. P2B Article 8(a) bars retroactive
   terms changes outright.
2. The burden of proof sits on a named party, decided by rule not by discretion. eBay: no tracking, seller
   loses and the platform may act unasked.
3. The evidence is a closed list of typed fields. Stripe's 30.
4. There is a deadline, it is visible to both sides and silence has a defined consequence. `due_by`, plus
   Upwork's 14-day auto-release.
5. The decision names the facts relied on, the clause applied and whether a machine decided. DSA 17(3).
6. There is an appeal to a different decider with a published window. DSA 20 (six months), eBay (30 days),
   Upwork (independent third-party arbitration).
7. Remedies are enumerated in advance, not invented per case. eBay lists refund, return for refund, partial
   refund with the buyer keeping the item, replacement and no-return-required cases.

### 5. Cold start on both sides and running first-party supply honestly

**The honest way to run your own supply is a disclosure rule and it is already written down in law.** P2B
Regulation Article 7(1) requires a platform to include in its terms "a description of any differentiated
treatment which they give, or might give" to goods offered by "either that provider itself or any business
users which that provider controls" as against everyone else and that description "shall refer to the main
economic, commercial or legal considerations for such differentiated treatment". Article 7(3) enumerates what
the description must cover and (b) is ranking: "ranking or other settings applied by the provider that
influence consumer access to goods or services offered through those online intermediation services by other
business users".

For a designated gatekeeper the softer disclosure duty hardens into a prohibition. DMA Article 6(5): "The
gatekeeper shall not treat more favourably, in ranking and related indexing and crawling, services and
products offered by the gatekeeper itself than similar services or products of a third party. The gatekeeper
shall apply transparent, fair and non-discriminatory conditions to such ranking."

That gives a four-line policy any marketplace can adopt on day one and it is the answer to the question the
brief is really asking:

1. Label operator-built supply on the listing itself, every surface it appears on.
2. Rank it under the identical formula, with no bonus term. Say so in the rulebook.
3. State the commercial reason it exists (reference implementation, category seeding, floor price).
4. Report first-party and third-party supply separately in any count you publish, so "four categories,
   deeply covered" never quietly means "four categories we built".

The failure mode to name explicitly: describing your own seeded listings as an ecosystem. 16 CFR 465.6 makes
the adjacent version of this an unfair practice, banning a business from misrepresenting "that a website,
organization, or entity that it controls, owns, or operates provides independent reviews or opinions". The
same logic covers presenting your own agents as independent supply.

**Verified data point on how the labelling gap looks in practice.** GitHub Marketplace does not distinguish
GitHub-authored actions in its listings. The docs describe only naming reservations, that "only the GitHub
organization can publish an action named `github`" and that "GitHub reserves the names of GitHub features".
Its trust signal is a partner badge, not a first-party badge: the verified creator badge means "GitHub has
verified the creator of the action as a partner organization", it is granted by request to a partnerships
address and it is lost on transfer "unless the new owner is also a verified creator". So the prior art here
is a gap, not a template. A marketplace that ships the label is doing better than the closest comparable.

**Seeding the supply side, with the mechanisms that are verifiable from the sources I read.**

- **Give the new supplier a score it did not earn, from a prior rather than from nothing.** This is the single
  highest-leverage cold-start move and it falls straight out of section 2. A brand-new agent with one clean job
  scores 0.8095 against an 0.80 prior. It is rankable on day one without being trusted.
- **Set a floor before a score exists.** Fiverr's Level 1 gate is 5 orders, 3 unique clients, $400 earned
  plus a 4.4 rating. Below that a seller is a New freelancer with 4 Gigs allowed. **Cap what an unproven supplier
  can list rather than refusing to list it.** That is a one-column change and it stops catalogue flooding.
- **Publish a peer group so a small supplier is not compared with a large one.** Fiverr: "The Success score is
  based on your performance relative to other freelancers in your price range." For four mandated agent
  categories that means four leaderboards, not one.
- **Do not let a listing rot.** Apple: "If your app no longer functions as intended or you're no longer actively
  supporting it, it will be removed from the App Store" and 4.3(b) reserves the right to remove listings that
  "do not attract customers". Reachability decay is the version that matters here and it is measurable: an
  endpoint that has not answered since a given date is not live supply.
- **Ship a machine-checkable listing gate instead of a review queue.** GitHub Marketplace's five conditions.
  For agents the equivalent gate is one live call that returns a well-formed result.
- **Run a randomised holdout on your own ranking so the seeding claim is measurable.** Upwork's placebo
  auctions, with the causal number they publish from it.

### 6. Takedowns, abuse reporting and the appeal path

**The notice format, from statute, because both available templates are law and both are free to copy.**

DMCA 512(c)(3)(A) requires six elements: a signature of an authorised person; identification of the work, or
"a representative list of such works at that site"; identification of the material "and information reasonably
sufficient to permit the service provider to locate the material"; contact information for the complainant; "A
statement that the complaining party has a good faith belief that use of the material in the manner complained
of is not authorized"; and a statement of accuracy "and under penalty of perjury, that the complaining party is
authorized to act on behalf of the owner". A notice that is substantially defective "shall not be considered...
in determining whether a service provider has actual knowledge", with one exception: if it substantially
complies with clauses (ii), (iii) and (iv), the provider must "promptly attempt to contact the person making the
notification or take other reasonable steps".

DSA Article 16(2) requires four elements: a substantiated explanation of why the content is illegal; "a clear
indication of the exact electronic location of that information, such as the exact URL or URLs"; the name and
email of the notifier, excepting child-safety reports; and "a statement confirming the bona fide belief of the
individual or entity submitting the notice that the information and allegations contained therein are accurate
and complete". Article 16(3) is the part that makes the format matter: a compliant notice "shall be considered to
give rise to actual knowledge or awareness" where a diligent provider could identify illegality "without a
detailed legal examination". Article 16(4) requires an acknowledgement of receipt, 16(5) requires notifying the
outcome plus redress options and 16(6) requires disclosing automated processing.

**The restore path with a hard window, from DMCA 512(g).** To keep its safe harbour a provider that took content
down on notice must: notify the subscriber promptly; on receiving a counter-notice, forward it and tell the
original complainant the material goes back "in 10 business days"; and actually restore it "not less than 10, nor
more than 14, business days following receipt of the counter notice", unless the complainant files suit. The
counter-notice needs a signature, identification of the removed material and its prior location, a statement under
penalty of perjury of "good faith belief that the material was removed or disabled as a result of mistake or
misidentification", plus consent to jurisdiction.

512(f) is the anti-abuse clause and it cuts both ways. Anyone who "knowingly materially misrepresents" that
material is infringing, **or** that it was removed by mistake, is liable for damages and fees. A marketplace can
copy that symmetry directly into its own terms.

**The appeal path, from DSA Articles 20 and 21.** Internal complaint handling must be available "for a period of
at least six months following the decision", electronically and free of charge and must cover four decision types:
removal or visibility restriction, service suspension or termination, account suspension or termination, plus
"decisions whether or not to suspend, terminate or otherwise restrict the ability to monetise information". The
clock starts when the user was informed. Handling must be "timely, non-discriminatory, diligent and non-arbitrary",
and where a complaint shows the decision was unfounded the provider "shall reverse its decision... without undue
delay". Article 21 adds an external route to a certified body that "shall not have the power to impose a binding
settlement", with a good-faith engagement duty on both sides and one escape: a provider may refuse "if a dispute
has already been resolved concerning the same information and the same grounds".

**Abuse of the reporting channel itself, from DSA Article 23 and this is the clause most marketplaces forget.**
Suspension is symmetric. 23(1) suspends users who "frequently provide manifestly illegal content". 23(2) suspends
notifiers and complainants who "frequently submit notices or complaints that are manifestly unfounded". Both need a
prior warning. 23(3) fixes the four factors to weigh, which is what makes the decision reviewable:

```
(a) absolute number of manifestly illegal items or manifestly unfounded notices in a time frame
(b) that number as a proportion of total items provided or notices submitted in the time frame
(c) the gravity of the misuse, including the nature of the content and its consequences
(d) the intention, where it is possible to identify it
```

23(4) requires publishing the policy "in a clear and detailed manner" with "examples of the facts and circumstances
that they take into account when assessing whether certain behaviour constitutes misuse and the duration of the
suspension". Article 22 completes the picture with priority handling for accredited flaggers who must be
independent of the platform and must publish an annual report of their notices.

**Prioritisation and enforcement mechanics from the commercial operators.**

- eBay automates the common case and reserves humans for contested ones: "We use automation to proactively remove
  feedback that goes against our policy", with manual review on request and removal "within 24 hours" once approved.
  Request window 90 days. Partial-compliance is handled by invitation rather than deletion: "we may invite the buyer
  to revise it so it can be published".
- Apple escalates from content to account: "Egregious or repeated behavior is grounds for removal from the Apple
  Developer Program" and cheating on discovery is called out by name, including if you "manipulate ratings or App
  Store discovery".
- Hugging Face degrades rather than deletes on a safety hit, badging the file and warning the reader.
- npm removes or renames without notice for squatting and takes only the trademark route for name claims. It will
  not arbitrate "because another user wants the name".
- Amazon's stated remedy for a suspected fake review is suppression: "we suppress the review completely, so it is
  not displayed".

The suppression choice interacts with 16 CFR 465.7(b), which is why the sentiment-neutral list matters: withholding
is fine where the criteria are "applied equally to all reviews submitted without regard to sentiment", including
where "The seller reasonably believes the review is fake". Publish the filter list, apply it symmetrically
and suppression is defensible. Filter on rating and it is not.

## Design implications for the marketplace

1. **The listing gate is a live call, not a review queue.** GitHub Marketplace proves a mechanical gate is enough
   at scale and npm gives the exact standard to apply to a catalogue full of shells: a listing is squatted if it
   "has no genuine function". For 287,029 registered agents where two publish a callable endpoint, one successful
   round trip against the declared capability is the only gate that changes the numbers. Everything else is theatre.
2. **Categories must be documents, not strings.** Copy the Hugging Face task-object shape and the Apple category
   prose together: for each of the four mandated categories ship a definition, a required-input and required-output
   contract, the metric the category is scored on, plus three to five hand-picked exemplars. This makes
   miscategorisation reviewable and makes "equally deep in all four" a checkable claim.
3. **Score with a Bayesian shrink toward a per-category prior and use Wilson only for the risk gate.** The single
   sentence to put in the rulebook: a new agent starts at the category prior and moves toward its own record as jobs
   accumulate. It kills the one-fake-review attack with arithmetic instead of fraud detection.
4. **Count only paid, settled jobs toward the score, while letting anyone comment.** Steam's exact split. On BSC the
   settled payment is already the primitive, so this costs one join.
5. **Weight by transaction size and decay with a published half life and make the score converge back to the prior
   on inactivity rather than to zero.** Upwork weights by earnings, Fiverr by order value and recency and both
   refuse to punish inactivity. The blended one-line formula is in section 2.
6. **Zero-weight feedback from inside the payer's funding cluster and record it anyway.** One hop of funding
   provenance, the published heuristic, plus the 25-event habitual threshold as a flag. Recording it keeps you clear
   of the suppression rule, zero weight keeps it out of the score.
7. **Assignment should be OpenRouter's policy with success rate substituted for price.** Short outage memory,
   randomised weighted pick among the qualified, demote on failure rather than exclude, rolling percentile window for
   the performance facets, hard constraints for spend caps and soft preferences for latency. It is the only mechanism
   in this document that is simultaneously production-proven, published in full and buildable in an afternoon.
8. **Add Thompson sampling on top only if there is time.** Ten lines, best on real data and specifically robust to
   the delayed rewards an agent job produces. Beta counters per agent per category, sample, pick the max. If time is
   short, epsilon-greedy with a published exploration percentage is a defensible shipped answer.
9. **Reserve the Dutch auction for price discovery, not for supplier selection.** UniswapX's decay plus the
   exclusivity override is the right tool when the buyer states a budget range and wants the market to fill it. Filter
   on eligibility first or the fastest responder wins every job regardless of quality.
10. **Escrow must auto-release on silence.** Fund first, submit through the platform, a short review window, auto-release
    on expiry, one restart per change request, then dispute. Without auto-release escrow is a hostage mechanism.
11. **The dispute evidence schema is Stripe's, renamed.** Typed fields grouped as delivered, used, promised, ruled,
    said, rebutted. Plus `due_by`, `submission_count`, `past_due` and a `prevented` state for auto-refunds that never
    become disputes. On-chain this schema is unusually strong, because delivery and payment evidence are both hashes.
12. **Every adverse decision emits a statement of reasons, including demotions.** DSA 17(3)'s six elements and 17(1)
    explicitly covers demotion and payment suspension. A machine-readable reasons log is a differentiator here, not a
    compliance chore and it is what makes a ranking claim auditable.
13. **Appeals need a published window and a different decider.** Six months is the DSA floor, 30 days is eBay's
    practice. Standard on appeal should be new evidence only, which is eBay's framing ("provide additional
    documentation").
14. **Suspend abusive reporters on the same terms as abusive listers.** DSA Article 23's symmetry plus its four
    factors. A marketplace with a takedown button and no misuse rule will be used as a weapon against rival agents.
15. **Label operator-built agents, rank them under the same formula with no bonus term and report first-party and
    third-party counts separately.** P2B Article 7 gives the disclosure wording, DMA 6(5) gives the no-favouritism
    wording and the closest comparable marketplace does not do it, so shipping it is a visible edge.
16. **Publish the ranking parameters and the thresholds, withhold the coefficients.** P2B 5(1) plus the 5(6) carve-out
    is the exact licence for this and it is what Fiverr, Steam and IMDb all actually do.
17. **Instrument the ranking with a randomised holdout from day one.** Upwork's placebo auction is the only design in
    this document that produces a causal number about whether the matching helps. Even a 2% holdout gives an honest
    claim instead of a screenshot.

## Mechanism, operator, cost and whether it fits four days

Cost is engineering effort for a working version inside this codebase, not a polished one. Fit assumes a build window
closing 2026-09-09 with a functional publicly accessible submission required during judging.

| Mechanism | Who runs it in production | Build cost | Fits four days |
| --- | --- | --- | --- |
| Closed category list, each category a document with contract plus exemplars | Hugging Face (47 tasks), Apple (category prose) | 1 day of writing, trivial code | Yes and it is the highest-value writing in the build |
| Mechanical listing gate (live call returns a valid result) | GitHub Marketplace, npm functional-squatting test | 0.5 day | Yes, do it first |
| Per-file or per-listing machine-readable safety verdict with three levels | Hugging Face `securityRepoStatus` | 0.5 day for the field plus badge, more for real scanning | Yes for the field and badge, no for real scanning |
| Facet set split into hard constraints and soft preferences | OpenRouter `provider.*` | 0.5 day | Yes |
| Verified-transaction-only scoring with an open comment layer | Steam, Airbnb, Upwork, eBay | 0.5 day, the payment record already exists | Yes, non-negotiable |
| Bayesian shrink toward a per-category prior | IMDb (chart formula) | 1 hour | Yes |
| Wilson lower bound for a risk gate | canonical published implementation | 1 hour | Yes |
| Size-weighted exponential decay with a published half life | Upwork (earnings weighting, 6/12/24-month windows), Fiverr (value plus recency) | 2 hours | Yes |
| Counterparty discount list (flagged buyers do not damage a supplier) | Upwork, IMDb, Steam | 2 hours | Yes |
| Funding-cluster wash-trade filter, one hop plus a count threshold | published NFT wash-trading heuristic | 0.5 day given an indexer | Yes if agent payments are already indexed |
| Sybil score as an HTTP read with `passing_score` | Human Passport API | 2 hours plus a key | Yes, treat as optional enrichment |
| Simultaneous double-blind review reveal on a clock | Airbnb (14 days) | 0.5 day | Yes with a short clock and it is a strong story |
| Anomaly-window exclusion for review bombing | Steam | 1 day for detection, 1 hour for the exclusion flag | Only the flag plus a manual trigger |
| Randomised weighted dispatch, short outage memory, demote-not-exclude, rolling percentile window | OpenRouter | 1 day | Yes, this is the assignment engine |
| Batched matching over a short window | Uber | 1 day, plus load you probably will not have | No, batch size will be 1 |
| Blocklist on prior worst-outcome pairs | Uber (one-star block) | 1 hour | Yes |
| Weighted least-request with `(active+1)^bias` | Envoy | 2 hours | Yes, it is one expression |
| Power of two choices | Envoy | 1 hour | Yes |
| Thompson sampling with Beta counters per agent per category | published production ad comparison, best result | 3 hours | Yes and it is the cheapest way to look sophisticated |
| LinUCB with context features | Yahoo Front Page experiment | 1 day plus feature engineering | No |
| epsilon-greedy with a published exploration percentage | shipped commercial personalisation service | 1 hour | Yes, as the fallback |
| Generalised second-price sealed bid | Google search ads | 0.5 day | Yes, though it needs bidders to be interesting |
| Pay-your-bid multi-slot auction with a charge-on-interaction rule | Upwork Boosted Proposals | 0.5 day | Yes, simpler than second price |
| Dutch auction with linear decay plus a priced exclusivity override | UniswapX | 1 day off-chain, 2 days on-chain | Yes off-chain, no on-chain |
| Randomised placebo holdout to measure your own ranking | Upwork | 3 hours | Yes and almost nobody does it |
| Fund-first escrow with auto-release on silence and clock restart on change request | Upwork | 1 day | Yes |
| Typed dispute evidence schema with `due_by` and `submission_count` | Stripe | 0.5 day for the schema, 1 day with UI | Yes |
| Machine-checkable proof-of-delivery checklist that decides the burden | eBay (tracking, scan, status, zip, $750 signature) | 0.5 day | Yes and on-chain the proofs are hashes |
| Structured self-reported consumption evidence on a short clock | Apple `CONSUMPTION_REQUEST`, 12 hours | 0.5 day | Yes with bucketed values |
| Pre-dispute `prevented` state with automatic refund | Stripe | 3 hours | Yes |
| Paid binding third-party arbitration with non-participation defaults | Upwork (7 days, split cost, platform share above $20,000) | Policy only, no code | Publish the policy, stub the panel |
| Statement of reasons on every adverse action including demotion | DSA Article 17 | 0.5 day for the record, plus a public log | Yes and the public log is a differentiator |
| Internal appeal with a published window and a different decider | DSA Article 20 (six months), eBay (30 days) | 0.5 day | Yes for the intake, policy only for the panel |
| Notice format with the statutory elements | DMCA 512(c)(3), DSA Article 16 | 0.5 day as a form plus validator | Yes |
| Counter-notice with the 10-to-14 business day restore window | DMCA 512(g) | 0.5 day | Yes as policy plus a queue |
| Symmetric misuse suspension with the four weighing factors | DSA Article 23 | 0.5 day | Yes, mostly policy text |
| Trusted or accredited flagger priority queue | DSA Article 22 | 1 day plus a program nobody will join in four days | No, publish the intent |
| First-party supply label plus equal-ranking commitment plus split reporting | P2B Article 7, DMA Article 6(5) | 0.5 day | Yes and it is close to free |
| Published ranking parameters with withheld coefficients | Fiverr, Steam, IMDb, permitted by P2B 5(6) | 0.5 day of writing | Yes |
| Six-metric level system with thresholds and a grace period | Fiverr (Level 1/2/Top Rated, 30-day grace) | 1 day | Partly, ship two tiers not four |
| Peer-group normalisation by price band or category | Fiverr | 0.5 day | Yes and four categories make it natural |
| Human editorial curation and featuring | Apple, Google Play | Continuous headcount | No, replace with per-category exemplars |
| Reviewer trust graph | none in this sample | Weeks | No, use the counterparty discount list |

## Sources

All read or fetched 2026-09-05. Local artifacts live in `three/research/raw/`.

**Categorisation and browse**

- Apple App Store Review Guidelines, `https://developer.apple.com/app-store/review/guidelines/` → `raw/r13-apple-review-guidelines-2026-09-05.html`
- Apple App Store categories, `https://developer.apple.com/app-store/categories/` → `raw/r13-apple-categories-2026-09-05.html`
- Google Play Spam policy, `https://support.google.com/googleplay/android-developer/answer/9899034`
- Google Play "Functionality, Content, and User Experience", `https://support.google.com/googleplay/android-developer/answer/14983486`
- Google Play Deceptive Behavior, `https://support.google.com/googleplay/android-developer/answer/9888077` → `raw/r13-play-spam-minfunc-2026-09-05.html`
- Hugging Face task taxonomy, `https://huggingface.co/api/tasks` → `raw/r13-hf-api-tasks-2026-09-05.json`
- Hugging Face trending sort, `https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=5` → `raw/r13-hf-api-trending-2026-09-05.json`
- Hugging Face security status field, `https://huggingface.co/api/models/mcpotato/42-eicar-street?securityStatus=true` → `raw/r13-hf-securitystatus-eicar-2026-09-05.json`
- Hugging Face malware scanning docs, `https://huggingface.co/docs/hub/en/security-malware` → `raw/r13-hf-security-malware-2026-09-05.html`
- Hugging Face pickle scanning docs → `raw/r13-hf-security-pickle-2026-09-05.html`
- Hugging Face model tasks and widgets docs → `raw/r13-hf-models-tasks-2026-09-05.html`
- GitHub Marketplace publishing, `https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace`
- npm name disputes and squatting, `https://docs.npmjs.com/policies/disputes/` → `raw/r13-npm-disputes-2026-09-05.html`
- OpenRouter provider routing, `https://openrouter.ai/docs/features/provider-routing` → `raw/r13-openrouter-provider-routing-2026-09-05.html`

**Reputation**

- Steamworks user reviews, `https://partner.steamgames.com/doc/store/reviews`
- Steam review score sample across 10 apps, `https://store.steampowered.com/appreviews/<appid>?json=1&num_per_page=0&language=all&purchase_type=all` → `raw/r13-steam-review-bands-2026-09-05.txt`, plus `raw/r13-steam-appreviews-49520-2026-09-05.json`
- Steam announcement attempt (chrome only, body not rendered) → `raw/r13-steam-review-bomb-wayback.html`, `raw/r13-steam-app49520-2026-09-05.html`
- IMDb ratings FAQ, `https://help.imdb.com/article/imdb/track-movies-tv/faq-for-imdb-ratings/G67Y87TFYYP6TWAV` → `raw/r13-imdb-ratings-faq-2026-09-05.html`
- Wilson lower bound reference implementation, `https://www.evanmiller.org/how-not-to-sort-by-average-rating.html` → `raw/r13-wilson-evanmiller-2026-09-05.html`
- Fiverr Success score, `https://help.fiverr.com/api/v2/help_center/en-us/articles/21965360854673.json` → `raw/zd-fiverr-21965360854673.json`
- Fiverr freelancer levels, `.../articles/360010560118.json` → `raw/zd-fiverr-360010560118.json`
- Fiverr help-center search index → `raw/zd-fiverr-search-success.json`
- Upwork Job Success Score, `https://support.upwork.com/api/v2/help_center/en-us/articles/211063558.json`, `.../211068358.json`, `.../38437458199059.json` → `raw/zd-upwork-211063558.json`, `raw/zd-upwork-211068358.json`, `raw/zd-upwork-38437458199059.json`
- Airbnb review policy, `https://www.airbnb.com/help/article/13/airbnbs-review-policy`
- Airbnb authentic and trustworthy reviews policy, `https://www.airbnb.com/help/article/2673`
- eBay feedback policies, `https://www.ebay.com/help/policies/feedback-policies/feedback-policies?id=4230`
- FTC Rule on the Use of Consumer Reviews and Testimonials, 16 CFR 465, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-01/title-16.xml?part=465` → `raw/r13-ftc-16cfr465-2026-09-05.xml`
- NFT wash trading heuristic, `https://www.chainalysis.com/blog/2022-crypto-crime-report-preview-nft-wash-trading-money-laundering/`
- Human Passport API reference, `https://docs.passport.human.tech/building-with-passport/passport-api/api-reference`
- Amazon proactive controls, `https://trustworthyshopping.aboutamazon.com/approach/robust-proactive-controls`

**Assignment**

- OpenRouter provider routing (same capture as above)
- Envoy load balancers, `https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers`
- Uber marketplace matching, `https://www.uber.com/gb/en/marketplace/matching/`
- UniswapX decay library, `https://raw.githubusercontent.com/Uniswap/UniswapX/main/src/lib/DutchDecayLib.sol` → `raw/r13-uniswapx-DutchDecayLib.sol`
- UniswapX order struct and EIP-712 types, `.../src/lib/DutchOrderLib.sol` → `raw/r13-uniswapx-DutchOrderLib.sol`
- UniswapX exclusivity, `.../src/lib/ExclusivityLib.sol` → `raw/r13-uniswapx-ExclusivityLib.sol`
- Google Ads actual cost-per-click, `https://support.google.com/google-ads/answer/6297`
- Google Ads auction overview, `https://support.google.com/google-ads/answer/1704431`
- Upwork Boosted Proposals, `https://support.upwork.com/api/v2/help_center/en-us/articles/4406395531795.json`, `.../4406541109011.json`, `.../40444950584083.json`, `.../40444931342099.json` → `raw/zd-upwork-4406395531795.json` and siblings
- Upwork placebo auctions, `.../articles/11983621573395.json` → `raw/zd-upwork-11983621573395.json`
- Thompson sampling empirical evaluation, NeurIPS 2011, `https://proceedings.neurips.cc/paper_files/paper/2011/file/e53a0a2978c28872a4505bdb51db06dc-Paper.pdf` → `raw/r13-thompson-chapelle-li-2011.pdf` and `.txt`
- Contextual bandit news recommendation, arXiv:1003.0146, `https://arxiv.org/pdf/1003.0146v2` → `raw/r13-linucb-1003.0146.pdf` and `.txt`
- Azure Personalizer exploration, `https://learn.microsoft.com/en-us/azure/ai-services/personalizer/concepts-exploration`

**Escrow and disputes**

- eBay Money Back Guarantee, `https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210` → `raw/r13-ebay-mbg-2026-09-05.html`
- Upwork fixed-price review and pay, `https://support.upwork.com/api/v2/help_center/en-us/articles/17974824831507.json`
- Upwork Fixed-Price Payment Protection, `.../articles/211063748.json`
- Upwork arbitration, `.../articles/14044146250259.json`
- Stripe dispute object, `https://docs.stripe.com/api/disputes/object`
- Stripe responding to disputes → `raw/r13-stripe-disputes-responding-2026-09-05.html`
- Apple Send Consumption Information, `https://developer.apple.com/tutorials/data/documentation/appstoreserverapi/send-consumption-information.json` → `raw/r13-apple-consumption-2026-09-05.json`
- Apple ConsumptionRequest fields, `.../appstoreserverapi/consumptionrequest.json` → `raw/r13-apple-consumptionrequest-2026-09-05.json`
- Airbnb cancelling during a stay, `https://www.airbnb.com/help/article/544`
- PayPal user agreement (saved, timelines not extracted) → `raw/r13-paypal-ua-2026-09-05.html`

**Cold start, first-party supply, takedowns**

- P2B Regulation (EU) 2019/1150, Articles 5, 7, 8, `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019R1150` → `raw/r13-eu-p2b-2019-1150-2026-09-05.html`
- Digital Markets Act (EU) 2022/1925, Article 6(5), `...?uri=CELEX:32022R1925` → `raw/r13-eu-dma-2022-1925-2026-09-05.html`, `raw/r13-eu-dma-text-2026-09-05.txt`
- Digital Services Act (EU) 2022/2065, Articles 16, 17, 20, 21, 22, 23, `...?uri=CELEX:32022R2065` → `raw/r13-eu-dsa-2022-2065-2026-09-05.html`, `raw/r13-eu-dsa-text-2026-09-05.txt`
- 17 U.S.C. 512, `https://www.law.cornell.edu/uscode/text/17/512` → `raw/r13-usc17-512-2026-09-05.html`, `raw/r13-usc17-512-text-2026-09-05.txt`
- GitHub Marketplace verified creator (same capture as above)

**Own work**

- `three/research/tools/r13-reputation-math.py` runs every formula quoted here on real numbers. Wilson, Bayesian
  shrink, Beta posterior mean, size-weighted decay, inverse-square price weighting, Envoy weighted least request,
  UCB1 bonus, LinUCB alpha. Two of its outputs reproduce published worked examples exactly (OpenRouter's 9x ratio,
  Envoy's 0.4 effective weight), which is the check that the readings are right.





















