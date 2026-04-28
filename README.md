# Shadow Twin

> **Real-time AI bias detection. Not after 10,000 decisions. On the very first one.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-shadowtwin--16060.web.app-blue?style=for-the-badge)](https://shadowtwin-16060.web.app)
[![Google Solution Challenge 2026](https://img.shields.io/badge/Google%20Solution%20Challenge-2026-red?style=for-the-badge)](https://developers.google.com/community/gdsc-solution-challenge)
[![Track](https://img.shields.io/badge/Track-Unbiased%20AI%20Decision-green?style=for-the-badge)](#)

---

## The Problem

AI systems decide who gets a loan, who gets hired, and who receives medical care. They learn from historical data — data that already encodes decades of systemic discrimination. Every existing tool catches this bias *retrospectively*, after thousands of decisions have already harmed real people. Worse, they all require access to the model's training data or internals.

**Shadow Twin catches bias at the moment the decision is made — on the very first one.**

---

## How It Works

Shadow Twin is built on **counterfactual fairness** — a decision is unbiased only if it would remain the same regardless of the applicant's protected attributes.

```
Real Input:     "Priya Sharma, 28F, Dharavi, Mumbai, Income ₹4.2L"
                           ↓
              AI Decision System says: REJECTED
                           ↓
Shadow Twin generates counterfactual:
Shadow Input:   "Alex Johnson, 32M, Bandra, Mumbai, Income ₹4.2L"
                           ↓
              Gemini 2.5 Pro simulates same decision: APPROVED
                           ↓
Divergence detected → Bias type: Name (ethnicity/gender proxy) + Postcode (socioeconomic proxy)
                           ↓
              Instant flag, plain-language explanation, logged to dashboard
```

For every incoming decision, Shadow Twin silently generates up to **six shadow variants** — one per protected attribute — with all financial and professional fields held constant. It then compares outcomes, scores severity (0–100), and surfaces the exact causal attribute in under 5 seconds.

**Critical differentiator: Shadow Twin requires zero access to the model being audited.** It wraps any existing AI at the API layer. A bank never needs to expose its proprietary loan model.

---

## What Makes This Different

| Dimension | IBM AI Fairness 360 / Fairlearn | Google What-If Tool | **Shadow Twin** |
|---|---|---|---|
| When it runs | After decisions are made | During model development | **At the moment of decision** |
| What it needs | Full training dataset + model access | Model internals | **Only the input and output** |
| Granularity | Population-level statistics | Feature importance | **Individual decision, specific attribute** |
| Output | Bias score on a dataset | Feature visualization | **"This decision shows postcode bias"** |
| Speed | Hours to days | Manual exploration | **Under 5 seconds** |
| Model access required | Yes | Yes | **No — black-box compatible** |
| Legal compliance artifact | No | No | **Yes — per-decision audit log** |

---

## Bias Dimensions Evaluated

Shadow Twin tests six protected attribute dimensions per decision:

1. **Name bias** — First/last name signals gender, ethnicity, and religion
2. **Location/postcode bias** — Postcodes as socioeconomic proxies
3. **Gender bias** — Explicit gender markers neutralized and flipped
4. **Age bias** — Age swapped across a 10-year band within the same legal working range
5. **Linguistic pattern bias** — Writing style and vocabulary complexity normalized
6. **Compounding bias** — Intersectional discrimination (e.g., female name + low-income postcode)

Each flagged decision receives a **Bias Severity Score (BSS)** from 0–100:

| Score | Label | Action |
|---|---|---|
| 0–20 | Negligible | Likely driven by legitimate factors |
| 21–50 | Moderate | Review recommended |
| 51–80 | Severe | Escalation required |
| 81–100 | Critical | Compliance breach — strong evidence of illegal discrimination |

---

## Tech Stack

### Google Technologies

| Service | Role |
|---|---|
| **Gemini 2.5 Pro** | Attribute extraction, shadow generation, decision simulation, bias analysis + chain-of-thought scoring |
| **Firebase Firestore** | Decision records, shadow results, audit logs |
| **Firebase Hosting** | React frontend with global CDN |
| **Firebase Auth** | Google Sign-In for organization dashboards |
| **Firebase Realtime Database** | Live dashboard feed — new decisions appear without polling |
| **Google Cloud Run** | Containerized FastAPI evaluation engine, scales to zero |
| **Vertex AI** | Gemma 3 for privacy-sensitive on-premise evaluation (roadmap) |
| **Google Cloud Natural Language API** | Linguistic pattern analysis on free-text fields |
| **Google Maps / Places API** | Postcode-to-socioeconomic-tier enrichment for valid counterfactual swaps |
| **Google Analytics + Looker Studio** | Aggregate bias rate reporting |

### Application Stack

- **Backend:** Python 3.12, FastAPI, Docker → Cloud Run
- **Frontend:** React, Firebase Hosting
- **Database:** Cloud Firestore + Firebase Realtime Database

---

## The Gemini Pipeline

Every evaluation runs through a four-stage Gemini 2.5 Pro pipeline:

**Stage 1 — Attribute Extraction**
Gemini classifies all fields that could serve as protected attribute proxies without manual tagging. It knows "Priya Sharma" signals gender, religion, and ethnicity in the Indian context. "Dharavi" signals low socioeconomic status. No explicit labels needed.

**Stage 2 — Shadow Variant Generation**
Generates one counterfactual per attribute, keeping all financial and professional fields identical. Shadow postcodes are always same city, same urban tier, different income bracket — ensuring the test is valid and interpretable.

**Stage 3 — Decision Simulation (Demo)**
Gemini acts as a legacy loan AI trained on historical Indian banking data (2005–2018), reproducing the learned correlations of that era without explicit rules. This is how Shadow Twin demonstrates its capabilities without requiring a real organization's proprietary system.

**Stage 4 — Bias Analysis**
Chain-of-thought reasoning over the full comparison set produces the BSS, identifies the causal attribute, and writes a plain-language explanation for a compliance officer.

---

## Application Flow

### Demo Mode (No login required)

1. Land on `/` → click **"See it catch bias live"**
2. `/demo` — pre-filled synthetic loan applicant (Priya Sharma, 28F, Dharavi, ₹4.2L income, credit score 710)
3. Hit **Submit** — real pipeline runs, real API calls
4. Processing animation maps to actual stages: attribute extraction → shadow generation → comparison → analysis
5. Results view: side-by-side rejected/approved comparison, severity badge, attribute table, plain-language explanation
6. Download the audit report

### Organization Mode (Auth required)

- `/dashboard/decisions` — real-time feed of all decisions, color-coded by severity
- `/dashboard/analytics` — 30-day trend lines, bias by attribute (name, postcode, age, gender), bias by decision category
- `/dashboard/reports/{id}` — full audit report with Gemini reasoning chain, downloadable PDF

---

## API Reference

### `POST /api/v1/demo/evaluate`
No auth required. Runs the full shadow twin pipeline on a synthetic profile.

### `POST /api/v1/evaluate`
Auth required. Accepts any decision input and returns a full bias verdict.

**Request:**
```json
{
  "decision_id": "uuid-v4",
  "organization_id": "org_abc123",
  "decision_category": "loan_approval",
  "input": {
    "applicant_name": "Priya Sharma",
    "age": 28,
    "gender": "female",
    "postcode": "400017",
    "city": "Mumbai",
    "annual_income_inr": 420000,
    "employment_status": "salaried",
    "loan_amount_requested_inr": 500000,
    "credit_score": 710
  },
  "original_decision": {
    "outcome": "rejected",
    "reason": "Insufficient creditworthiness based on risk profile"
  }
}
```

**Response:**
```json
{
  "bias_detected": true,
  "bias_severity_score": 73,
  "severity_label": "severe",
  "primary_causal_attribute": "applicant_name",
  "secondary_causal_attribute": "postcode",
  "shadow_results": [...],
  "bias_explanation": "The decision reversed when the applicant name was changed to a gender-neutral, non-South Asian name...",
  "recommended_action": "Escalate for human review.",
  "processing_time_ms": 2847
}
```

Additional endpoints: `GET /api/v1/decisions`, `GET /api/v1/decisions/{id}/report`, `GET /api/v1/analytics`

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 18+
- Google Cloud project with Gemini, Maps, and Natural Language APIs enabled
- Firebase project with Firestore, Realtime DB, Auth, and Hosting configured

### Backend

```bash
git clone https://github.com/your-org/shadow-twin
cd shadow-twin/backend

python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn google-generativeai google-cloud-firestore \
            google-cloud-language googlemaps firebase-admin python-dotenv

cp .env.example .env
# Fill in your API keys (see Environment Variables below)

uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

```env
GEMINI_API_KEY=
GOOGLE_CLOUD_PROJECT=shadow-twin-prod
GOOGLE_MAPS_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
FIRESTORE_DATABASE_URL=
REALTIME_DB_URL=
ENVIRONMENT=production
CORS_ORIGINS=https://shadowtwin.web.app
```

---

## Deployment

```bash
# Backend → Cloud Run
gcloud run deploy shadow-twin-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production

# Frontend → Firebase Hosting
cd frontend
npm run build
firebase deploy --only hosting
```

---

## Project Structure

```
shadow-twin/
├── backend/
│   ├── main.py                  # FastAPI app + route definitions
│   ├── pipeline/
│   │   ├── attribute_extractor.py   # Gemini Stage 1
│   │   ├── shadow_generator.py      # Gemini Stage 2
│   │   ├── decision_simulator.py    # Gemini Stage 3
│   │   └── bias_analyzer.py         # Gemini Stage 4
│   ├── integrations/
│   │   ├── maps_enrichment.py       # Postcode → socioeconomic tier
│   │   └── nlp_analysis.py          # Linguistic pattern detection
│   └── Dockerfile
└── frontend/
    └── src/
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Demo.jsx             # Primary demo flow
        │   ├── Login.jsx
        │   └── dashboard/
        │       ├── Decisions.jsx    # Real-time feed
        │       ├── Analytics.jsx    # Chart.js charts
        │       └── Report.jsx       # Audit report view
        ├── components/
        │   └── demo/
        │       ├── ApplicationForm.jsx
        │       ├── ProcessingState.jsx
        │       └── BiasResults.jsx  # The comparison view
        └── hooks/
            ├── useLiveFeed.js       # Firebase Realtime DB listener
            └── useShadowEval.js     # POST to /api/v1/evaluate
```

---

## Success Metrics

| Metric | Target |
|---|---|
| End-to-end evaluation latency | < 5 seconds |
| Bias detection accuracy on known-biased test cases | > 85% |
| False positive rate | < 15% |
| Dashboard load time | < 2 seconds |

---

## UN SDG Alignment

- **SDG 10: Reduced Inequalities** — Prevents AI systems from systematically disadvantaging people based on protected characteristics
- **SDG 16: Peace, Justice, and Strong Institutions** — Provides audit infrastructure that makes AI governance enforceable
- **SDG 8: Decent Work** — Protects job applicants from discriminatory automated hiring screens

---

## Roadmap

**Phase 2**
- REST API SDK for direct pipeline integration
- Webhook support — plug Shadow Twin into any existing AI call, receive bias verdict alongside original response
- Remediation suggestions — Gemini generates a recommended alternative decision when bias is detected

**Phase 3**
- Gemma 3 on-device deployment for data-sovereignty-constrained organizations
- Multi-language support (Hindi, Bengali, Tamil)
- Pre-formatted regulatory reports for EU AI Act, RBI AI governance guidelines, EEOC requirements

---

## Security

- All endpoints except `/demo/evaluate` require Firebase Auth JWT
- No raw PII stored — names hashed before Firestore write
- Gemini API key server-side only, never exposed to browser
- Cloud Run service account uses minimum required IAM roles
- Firebase Security Rules enforce strict cross-organization isolation

---

## Built For

**Google Solution Challenge 2026**
Track: *Unbiased AI Decision — Ensuring Fairness and Detecting Bias in Automated Decisions*
