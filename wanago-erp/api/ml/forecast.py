# Vercel-native Python serverless function (BaseHTTPRequestHandler
# convention — no framework needed). Stateless: receives already-aggregated
# historical feature rows as JSON from the TS cron
# (src/app/api/cron/weekly-ml-predictions/route.ts), does the numeric work,
# returns predictions as JSON. No Firestore/DB access here at all — the
# TS side owns all data access via the Admin SDK, same as every other
# server-side piece of this app.
#
# Honesty-first, matching this codebase's existing stance (see
# src/modules/dashboard/services/insights.service.ts and
# RevenueForecast.tsx): a model is only "trained" if there's genuinely
# enough data to make it not-noise. Below the minimum sample size, this
# returns trained=false with a clear note instead of emitting a
# confident-looking number from 1-2 data points. Revisit the thresholds
# below once real booking/lead volume exists.
import json
from http.server import BaseHTTPRequestHandler

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder

MIN_WEEKS_FOR_REVENUE_TREND = 6      # need at least ~6 weekly data points for a trend line to mean anything
MIN_LEADS_FOR_CONVERSION_MODEL = 20  # below this, logistic regression is just memorizing noise


def compute_revenue_forecast(weekly_revenue):
    """
    weekly_revenue: list of {"weekOf": "YYYY-MM-DD", "amount": number}, oldest first.
    Returns a 4-week-ahead forecast via simple linear regression (numpy.polyfit),
    blended with an EMA baseline for stability — same spirit as the existing
    dashboard's EMA forecast, just with a fitted trend added on top.
    """
    n = len(weekly_revenue)
    if n < MIN_WEEKS_FOR_REVENUE_TREND:
        return {
            "trained": False,
            "sampleSize": n,
            "weeklyForecast": [],
            "confidence": "insufficient",
            "note": f"Only {n} week(s) of revenue history — need at least {MIN_WEEKS_FOR_REVENUE_TREND} to forecast meaningfully.",
        }

    amounts = np.array([w["amount"] for w in weekly_revenue], dtype=float)
    x = np.arange(n, dtype=float)

    # Linear trend
    slope, intercept = np.polyfit(x, amounts, 1)

    # EMA baseline (stability anchor, same alpha-from-length idea as the dashboard's EMA)
    k = 2 / (n + 1)
    ema = amounts[0]
    for a in amounts:
        ema = a * k + ema * (1 - k)

    mean = amounts.mean()
    cv = (amounts.std() / mean) if mean > 0 else 1.0
    confidence = "high" if cv < 0.15 else "medium" if cv < 0.4 else "low"

    last_date = weekly_revenue[-1]["weekOf"]
    from datetime import datetime, timedelta
    last_dt = datetime.strptime(last_date, "%Y-%m-%d")

    forecast = []
    for i in range(1, 5):
        trend_amount = slope * (n - 1 + i) + intercept
        blended = max(0.0, (trend_amount + ema) / 2)
        forecast.append({
            "weekOf": (last_dt + timedelta(weeks=i)).strftime("%Y-%m-%d"),
            "amount": round(blended, 2),
        })

    return {
        "trained": True,
        "sampleSize": n,
        "weeklyForecast": forecast,
        "confidence": confidence,
        "note": None,
    }


def compute_lead_conversion_model(leads):
    """
    leads: list of {"destination": str, "source": str, "pax": number|None,
                     "budget": number|None, "outcome": "won"|"lost"}.
    Only leads with a known won/lost outcome are used (open leads excluded).
    Returns a fitted logistic regression's train-accuracy as a rough
    self-check, plus which destinations correlate with winning — NOT
    per-lead live scoring yet (that would need the cron to also fetch open
    leads and score them individually; left for a later iteration once
    there's enough data for this to be worth doing).
    """
    labeled = [l for l in leads if l.get("outcome") in ("won", "lost")]
    n = len(labeled)
    if n < MIN_LEADS_FOR_CONVERSION_MODEL:
        return {
            "trained": False,
            "sampleSize": n,
            "accuracy": None,
            "topDestinations": [],
            "note": f"Only {n} lead(s) with a known outcome — need at least {MIN_LEADS_FOR_CONVERSION_MODEL} to train a conversion model.",
        }

    destinations = [l.get("destination") or "Unknown" for l in labeled]
    sources = [l.get("source") or "Unknown" for l in labeled]
    pax = np.array([[l.get("pax") or 0] for l in labeled], dtype=float)
    budget = np.array([[l.get("budget") or 0] for l in labeled], dtype=float)
    y = np.array([1 if l["outcome"] == "won" else 0 for l in labeled])

    cat = np.array(list(zip(destinations, sources)))
    encoder = OneHotEncoder(handle_unknown="ignore")
    cat_encoded = encoder.fit_transform(cat).toarray()

    X = np.hstack([cat_encoded, pax, budget])

    model = LogisticRegression(max_iter=500)
    model.fit(X, y)
    accuracy = float(model.score(X, y))

    # Rough "what correlates with winning" signal: destination one-hot
    # coefficients, sorted descending — a coarse readout, not a causal claim.
    dest_categories = list(encoder.categories_[0])
    dest_coef_len = len(dest_categories)
    dest_coefs = model.coef_[0][:dest_coef_len]
    ranked = sorted(zip(dest_categories, dest_coefs), key=lambda t: t[1], reverse=True)
    top_destinations = [d for d, c in ranked[:3] if c > 0]

    return {
        "trained": True,
        "sampleSize": n,
        "accuracy": round(accuracy, 3),
        "topDestinations": top_destinations,
        "note": "Training accuracy only (not cross-validated) — still directional at this sample size.",
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length) if content_length else b"{}"
            data = json.loads(raw or b"{}")

            weekly_revenue = data.get("weeklyRevenue", [])
            leads = data.get("leads", [])

            result = {
                "revenueForecast": compute_revenue_forecast(weekly_revenue),
                "leadConversion": compute_lead_conversion_model(leads),
            }

            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:  # noqa: BLE001 — always return JSON, never a bare 500 HTML page
            body = json.dumps({"error": str(exc)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_GET(self):
        body = json.dumps({"ok": True, "service": "wanago-ml-forecast"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
