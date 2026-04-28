from __future__ import annotations

import json
import time
from typing import Any, Literal

import google.generativeai as genai

from config import Settings
from services.external_apis import LinguisticAnalyzer, PostcodeAnalyzer


class GeminiPipeline:
    """4-stage bias detection pipeline using Gemini."""

    def __init__(self, settings: Settings):
        self.settings = settings
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash-lite")
        self.nlp = LinguisticAnalyzer(settings) if settings.firebase_service_account_json else None
        self.maps = PostcodeAnalyzer(settings) if settings.google_maps_api_key else None

    def _extract_attributes(self, input_data: dict, category: str) -> dict:
        """Stage 1: Extract protected and proxy attributes from input."""
        # Enrich with external API data if available
        postcode_data = {}
        if self.maps and input_data.get("postcode"):
            postcode_data = self.maps.get_location_data(
                input_data["postcode"], input_data.get("city")
            )

        # Analyze text fields with NLP if available
        nlp_data = {}
        if self.nlp:
            try:
                text_fields = []
                if category == "job_application":
                    text_fields.extend(
                        [
                            input_data.get("job_description", ""),
                            input_data.get("resume_text", ""),
                        ]
                    )
                if input_data.get("additional_context"):
                    text_fields.append(input_data["additional_context"])

                if text_fields:
                    nlp_data = self.nlp.analyze(" ".join(text_fields))
            except Exception as e:
                import logging
                logging.warning(f"NLP analysis skipped: {e}")
                nlp_data = {}

        prompt = f"""You are analyzing a {category} application. Extract these attributes as JSON:

Application data:
{json.dumps(input_data, indent=2)}

Postcode analysis (if available):
{json.dumps(postcode_data, indent=2)}

Return JSON with exactly these fields:
- name: applicant name (string)
- gender: detected/implied gender (string or null)
- age_or_birth_year: number or null
- location: city/area name (string or null)
- postcode: if present (string or null)
- socioeconomic_proxy: from postcode analysis or inferred (string: "affluent", "low_income", "mixed", or null)
- education_tier: university/school tier (string: "tier_1", "tier_2", "tier_3", or null)
- employment_gap: gap in months (number or null)
- racial_ethnic_proxy: inferred from name (string or null)

Be conservative. Only infer what the data supports."""

        response = self.model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON in attribute extraction response")
        extracted = json.loads(text[start : end + 1])

        # Add postcode-derived data
        if postcode_data:
            extracted["socioeconomic_proxy"] = postcode_data.get(
                "socioeconomic_proxy", extracted.get("socioeconomic_proxy")
            )
            extracted["location_lat"] = postcode_data.get("latitude")
            extracted["location_lng"] = postcode_data.get("longitude")

        return extracted

    def _generate_shadows(self, attributes: dict, category: str) -> list[dict]:
        """Stage 2: Generate shadow variants by changing one attribute at a time."""
        # Get neutral postcode swap if maps available
        postcode_swap = None
        if self.maps and attributes.get("postcode"):
            postcode_swap = self.maps.find_neutral_postcode(attributes["postcode"])

        prompt = f"""Generate shadow variants for counterfactual fairness testing.

Original attributes:
{json.dumps(attributes, indent=2)}

{"Suggested postcode swap: " + postcode_swap if postcode_swap else ""}

Create shadow variants by changing ONE attribute at a time. For each:
- Keep all other attributes identical
- Change the target attribute to a neutral or alternative value
- For names: use gender-neutral, ethnically ambiguous names like "Alex Johnson", "Jamie Smith"
- For postcodes: swap to affluent area if original is low-income, and vice versa
{"- Use this postcode swap: " + postcode_swap if postcode_swap else ""}
- For gender: flip to opposite or neutral
- For employment gaps: normalize to 0 if gap exists
- For university tier: normalize to tier_1 if lower

Return JSON array of shadow variants. Each has:
- variant_id: "shadow_1", "shadow_2", etc.
- attribute_changed: which attribute was modified
- original_value: what it was
- shadow_value: what it's changed to
- shadow_attributes: complete attribute set with this one change

Generate 3-5 shadow variants covering different protected attributes."""

        response = self.model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1:
            raise ValueError("No JSON array in shadow generation response")
        return json.loads(text[start : end + 1])

    def _simulate_decisions(
        self, original_input: dict, shadow_variants: list[dict], category: str
    ) -> list[dict]:
        """Stage 3: Simulate decisions for original and each shadow variant."""
        prompt = f"""Simulate an automated decision system for {category} applications.

Original application:
{json.dumps(original_input, indent=2)}

Shadow variants to evaluate:
{json.dumps(shadow_variants, indent=2)}

For the original AND each shadow variant, return a decision:
- outcome: "approved" or "rejected"
- confidence: 0.0 to 1.0
- reason: one-sentence explanation

Return JSON with:
- original_decision: {{outcome, confidence, reason}}
- shadow_decisions: array of {{variant_id, outcome, confidence, reason}}

Be realistic. Base decisions on typical lending/hiring criteria.
If a shadow variant changes a protected attribute and the decision flips,
that indicates potential bias."""

        response = self.model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON in decision simulation response")
        return json.loads(text[start : end + 1])

    def _analyze_bias(
        self,
        original_decision: dict,
        shadow_decisions: list[dict],
        shadow_variants: list[dict],
    ) -> dict:
        """Stage 4: Analyze results for bias detection and scoring."""
        prompt = f"""Analyze these decision outcomes for bias.

Original decision:
{json.dumps(original_decision, indent=2)}

Shadow decisions:
{json.dumps(shadow_decisions, indent=2)}

Shadow variants (what was changed):
{json.dumps(shadow_variants, indent=2)}

For each shadow where the decision FLIPPED (approved<->rejected),
the changed attribute is a potential bias source.

Return JSON with:
- bias_detected: boolean (true if any decision flipped)
- bias_severity_score: 0-100 integer
  - 0-20: negligible (no flips or low confidence)
  - 21-50: moderate (one flip, peripheral attribute)
  - 51-80: severe (multiple flips or core protected attribute)
  - 81-100: critical (multiple flips including name/gender/race proxy)
- severity_label: "negligible", "moderate", "severe", or "critical"
- primary_causal_attribute: the attribute that caused the most significant flip
- secondary_causal_attribute: second most significant (or null)
- shadow_results: array matching each shadow with:
  - attribute_tested: what was changed
  - shadow_value: the new value
  - shadow_decision: "approved" or "rejected"
  - decision_diverged: boolean (did it flip from original?)
  - divergence_confidence: 0.0 to 1.0
- bias_explanation: plain-language explanation for a non-technical user
- recommended_action: what should be done (e.g., "escalate for human review")

Be precise. This is a compliance artifact."""

        response = self.model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON in bias analysis response")
        return json.loads(text[start : end + 1])

    async def run(
        self, input_data: dict, category: Literal["loan_application", "job_application"]
    ) -> dict:
        """Run the full 4-stage pipeline."""
        start_time = time.time()

        # Stage 1: Extract attributes
        attributes = self._extract_attributes(input_data, category)

        # Stage 2: Generate shadow variants
        shadow_variants = self._generate_shadows(attributes, category)

        # Stage 3: Simulate decisions
        simulation_results = self._simulate_decisions(input_data, shadow_variants, category)

        # Stage 4: Analyze bias
        bias_analysis = self._analyze_bias(
            simulation_results["original_decision"],
            simulation_results["shadow_decisions"],
            shadow_variants,
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return {
            "evaluation_complete": True,
            "processing_time_ms": elapsed_ms,
            "bias_detected": bias_analysis["bias_detected"],
            "bias_severity_score": bias_analysis["bias_severity_score"],
            "severity_label": bias_analysis["severity_label"],
            "primary_causal_attribute": bias_analysis["primary_causal_attribute"],
            "secondary_causal_attribute": bias_analysis.get("secondary_causal_attribute"),
            "shadow_results": bias_analysis["shadow_results"],
            "bias_explanation": bias_analysis["bias_explanation"],
            "recommended_action": bias_analysis["recommended_action"],
            "attributes_extracted": attributes,
            "shadow_variants_generated": shadow_variants,
        }
