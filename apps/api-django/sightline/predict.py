"""Student failure prediction.

A logistic-regression model fitted on a synthetic historical cohort (deterministic,
seeded) learns how eight academic signals relate to failing a course, then scores
current students from their real records. Feature importances come straight from the
fitted coefficients, so the dashboard shows what the model actually weighs.

If scikit-learn / numpy are missing the module falls back to a transparent weighted
sum using the same fixed weights, so the API never hard-depends on the ML stack.
"""

from functools import lru_cache

# (key, human label). Every feature is normalised to 0..1 where 1 = healthy / low risk.
FEATURES = [
    ("attendance_rate", "Attendance"),
    ("quiz_avg", "Quiz scores"),
    ("midterm_grade", "Midterm grades"),
    ("assignment_completion", "Assignment completion"),
    ("previous_gpa", "Previous GPA"),
    ("submission_frequency", "Submission frequency"),
    ("grade_trend", "Grade trends"),
    ("participation_score", "Participation score"),
]
FEATURE_KEYS = [key for key, _ in FEATURES]
FEATURE_LABELS = dict(FEATURES)

# Domain weights: how strongly a weak signal pushes toward failure. Used to generate
# synthetic labels for training and as the heuristic fallback. Order matches FEATURES.
_WEIGHTS = [0.20, 0.16, 0.18, 0.12, 0.14, 0.06, 0.08, 0.06]

MODEL_NAME = "logreg-failure-v1"
_HEURISTIC_NAME = "weighted-heuristic-v1"


def _clamp01(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if value < 0 else 1.0 if value > 1 else value


def blank_features():
    return {key: 0.0 for key in FEATURE_KEYS}


def vectorize(features):
    return [_clamp01(features.get(key, 0.0)) for key in FEATURE_KEYS]


@lru_cache(maxsize=1)
def _fit():
    """Return (predict_proba_fn, importance_dict, model_name). Cached for process life."""
    try:
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        return _heuristic_fit()

    rng = np.random.default_rng(42)
    n = 1200
    x = rng.beta(2.2, 2.0, size=(n, len(FEATURE_KEYS)))  # skew toward mid/high, realistic
    weights = np.array(_WEIGHTS)
    competence = x @ weights  # higher = healthier
    noise = rng.normal(0, 0.04, size=n)
    # Fail when weighted competence lands in the bottom band (+ noise). ~30% base rate.
    threshold = np.quantile(competence + noise, 0.30)
    y = ((competence + noise) < threshold).astype(int)

    scaler = StandardScaler().fit(x)
    model = LogisticRegression(max_iter=1000).fit(scaler.transform(x), y)

    coef = model.coef_[0]
    # Negative coef = protective (higher feature -> lower fail prob), which is expected.
    importance_raw = [abs(float(c)) for c in coef]
    total = sum(importance_raw) or 1.0
    importance = {key: round(val / total, 4) for key, val in zip(FEATURE_KEYS, importance_raw)}

    def predict_proba(vec):
        scaled = scaler.transform([vec])
        return float(model.predict_proba(scaled)[0][1])

    return predict_proba, importance, MODEL_NAME


def _heuristic_fit():
    total = sum(_WEIGHTS) or 1.0
    importance = {key: round(w / total, 4) for key, w in zip(FEATURE_KEYS, _WEIGHTS)}

    def predict_proba(vec):
        # Weighted "health" 0..1; failure prob is its complement, gently sharpened.
        health = sum(w * v for w, v in zip(_WEIGHTS, vec)) / total
        prob = 1.0 - health
        return _clamp01(prob ** 1.3 * 1.15)

    return predict_proba, importance, _HEURISTIC_NAME


def feature_importance():
    return _fit()[1]


def model_name():
    return _fit()[2]


def _level(score):
    # Values mirror StudentRiskScore.LEVEL_* choices.
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


def _factors(features, importance):
    """Human-readable drivers: weak features (< 0.5) ranked by model importance."""
    weak = [
        (key, features.get(key, 0.0), importance.get(key, 0.0))
        for key in FEATURE_KEYS
        if features.get(key, 0.0) < 0.5
    ]
    weak.sort(key=lambda item: item[2], reverse=True)
    out = [f"{FEATURE_LABELS[key]} low at {round(val * 100)}%" for key, val, _ in weak[:4]]
    return out or ["No individual risk factors detected"]


def predict(features):
    """features: dict of 0..1 values -> (risk_score 0-100, risk_level, factors[])."""
    predict_proba, importance, _ = _fit()
    vec = vectorize(features)
    score = round(predict_proba(vec) * 100)
    score = max(0, min(100, score))
    return score, _level(score), _factors(features, importance)


def demo():
    strong = {key: 0.9 for key in FEATURE_KEYS}
    weak = {key: 0.15 for key in FEATURE_KEYS}
    s_score, s_level, _ = predict(strong)
    w_score, w_level, w_factors = predict(weak)
    assert s_score < w_score, (s_score, w_score)
    assert s_level == "low" and w_level == "high", (s_level, w_level)
    imp = feature_importance()
    assert abs(sum(imp.values()) - 1.0) < 1e-6, sum(imp.values())
    assert len(w_factors) >= 1
    print(f"OK [{model_name()}] strong={s_score}({s_level}) weak={w_score}({w_level})")
    print("importance:", imp)


if __name__ == "__main__":
    demo()
