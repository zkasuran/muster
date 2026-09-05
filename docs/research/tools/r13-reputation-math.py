"""R13 prior-art math check. Runs every formula quoted in R13-prior-art.md on real numbers.
No network. python3 r13-reputation-math.py
"""
import math

def wilson_lower(pos, n, z=1.96):
    if n == 0:
        return 0.0
    p = pos / n
    return (p + z*z/(2*n) - z*math.sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)

def bayes_shrink(R, v, C, m):
    return (v/(v+m))*R + (m/(v+m))*C

def beta_mean(s, f, a=1.0, b=1.0):
    return (s+a)/(s+f+a+b)

def ewma_decay(vals, half_life_days):
    lam = math.log(2)/half_life_days
    num = den = 0.0
    for value, age_days, weight in vals:
        w = weight*math.exp(-lam*age_days)
        num += w*value
        den += w
    return num/den if den else 0.0

def inverse_square_weights(prices):
    raw = [1.0/(p*p) for p in prices]
    tot = sum(raw)
    return [r/tot for r in raw]

def envoy_weighted_least_request(weight, active, bias=1.0):
    return weight/((active+1)**bias)

def ucb1(mean, n_i, t, c=2.0):
    return mean + math.sqrt(c*math.log(t)/n_i)

def linucb_alpha(delta):
    return 1 + math.sqrt(math.log(2/delta)/2)

if __name__ == "__main__":
    print("Wilson 95% lower bound (z=1.96)")
    for pos, n in [(2,2),(5,5),(9,10),(45,50),(90,100),(900,1000),(100,101)]:
        print("  %4d/%-5d ratio=%.4f  wilson=%.4f" % (pos, n, pos/n, wilson_lower(pos, n)))

    print("\nIMDb-style Bayesian shrink, C=6.9 prior, m=25000 votes")
    for R, v in [(9.5,120),(9.5,25000),(9.5,2500000),(7.0,300)]:
        print("  R=%.2f v=%-8d WR=%.4f" % (R, v, bayes_shrink(R, v, 6.9, 25000)))

    print("\nShrink tuned for an agent marketplace: C=0.80 prior, m=20 jobs")
    for R, v in [(1.00,1),(1.00,5),(1.00,20),(1.00,200),(0.60,200)]:
        print("  success=%.2f jobs=%-5d score=%.4f" % (R, v, bayes_shrink(R, v, 0.80, 20)))

    print("\nBeta(1,1) posterior mean (Laplace)")
    for s, f in [(1,0),(0,1),(9,1),(90,10)]:
        print("  s=%-3d f=%-3d mean=%.4f" % (s, f, beta_mean(s, f)))

    print("\nSize-weighted decayed score, 30-day half life")
    rows = [(1.0, 1, 500.0), (1.0, 5, 500.0), (0.0, 2, 20000.0)]
    print("  one big recent failure vs two small wins ->", round(ewma_decay(rows, 30), 4))
    rows2 = [(1.0, 1, 500.0), (1.0, 5, 500.0), (0.0, 400, 20000.0)]
    print("  same failure 400 days old              ->", round(ewma_decay(rows2, 30), 4))

    print("\nOpenRouter-style inverse-square price weighting, $1/$2/$3")
    w = inverse_square_weights([1.0, 2.0, 3.0])
    print("  weights", [round(x, 4) for x in w], "ratio A:C =", round(w[0]/w[2], 2))

    print("\nEnvoy weighted least request, weight 2 active 4 bias 1")
    print("  effective weight =", envoy_weighted_least_request(2, 4, 1.0))

    print("\nUCB1 bonus, t=1000")
    for n_i in [1, 10, 100]:
        print("  n_i=%-4d mean=0.50 ucb=%.4f" % (n_i, ucb1(0.50, n_i, 1000)))

    print("\nLinUCB alpha = 1 + sqrt(ln(2/delta)/2)")
    for d in [0.1, 0.05, 0.01]:
        print("  delta=%.2f alpha=%.4f" % (d, linucb_alpha(d)))
