from __future__ import annotations

import logging
from typing import Literal

import google.cloud.language_v1 as language
import requests

from config import Settings


class LinguisticAnalyzer:
    """Analyze text for linguistic proxy indicators using Google Cloud NLP."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = None
        if settings.firebase_service_account_json:
            try:
                self.client = language.LanguageServiceClient.from_service_account_json(
                    settings.firebase_service_account_json
                )
            except Exception as e:
                logging.warning(f"Failed to initialize Cloud NLP client: {e}")

    def analyze(self, text: str) -> dict:
        """Analyze text for sentiment, entities, and proxy indicators."""
        if not self.client:
            return {
                "sentiment_score": 0.0,
                "sentiment_magnitude": 0.0,
                "entities": [],
                "proxy_indicators": [],
            }

        try:
            document = language.Document(content=text, type_=language.Document.Type.PLAIN_TEXT)
            sentiment_response = self.client.analyze_sentiment(request={"document": document})
            sentiment = sentiment_response.document_sentiment
            entities_response = self.client.analyze_entities(request={"document": document})
            entities = []
            for entity in entities_response.entities:
                entities.append({
                    "name": entity.name,
                    "type": entity.type_.name,
                    "salience": entity.salience,
                    "mentions": [m.text.content for m in entity.mentions],
                })
            proxy_indicators = []
            for entity in entities:
                if entity["type"] in ["PERSON", "LOCATION", "ORGANIZATION"]:
                    proxy_indicators.append({
                        "text": entity["name"],
                        "type": entity["type"],
                        "potential_proxy": True,
                        "salience": entity["salience"],
                    })
            return {
                "sentiment_score": sentiment.score,
                "sentiment_magnitude": sentiment.magnitude,
                "entities": entities,
                "proxy_indicators": proxy_indicators,
            }
        except Exception as e:
            # API not enabled or other error - return empty results
            import logging
            logging.warning(f"Cloud NLP failed: {e}. Returning empty results.")
            return {
                "sentiment_score": 0.0,
                "sentiment_magnitude": 0.0,
                "entities": [],
                "proxy_indicators": [],
            }


class PostcodeAnalyzer:
    """Analyze postcodes for socioeconomic data using Google Maps/Places API."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.maps_key = settings.google_maps_api_key
        self.session = requests.Session()

    def get_location_data(self, postcode: str, city: str = None) -> dict:
        """Get location and socioeconomic proxy data for a postcode."""
        if not self.maps_key:
            return {
                "formatted_address": postcode,
                "socioeconomic_proxy": "unknown",
                "latitude": None,
                "longitude": None,
                "place_type": "unknown",
            }

        # Geocode the postcode
        query = f"{postcode}"
        if city:
            query += f", {city}"

        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        try:
            response = self.session.get(
                geocode_url, params={"address": query, "key": self.maps_key}, timeout=5
            )
        except Exception:
            return {
                "formatted_address": postcode,
                "socioeconomic_proxy": "unknown",
                "latitude": None,
                "longitude": None,
                "place_type": "unknown",
            }

        if response.status_code != 200:
            return {
                "formatted_address": postcode,
                "socioeconomic_proxy": "unknown",
                "latitude": None,
                "longitude": None,
                "place_type": "unknown",
            }

        data = response.json()
        if not data.get("results"):
            return {
                "formatted_address": postcode,
                "socioeconomic_proxy": "unknown",
                "latitude": None,
                "longitude": None,
                "place_type": "unknown",
            }

        result = data["results"][0]
        location = result["geometry"]["location"]

        # Determine socioeconomic proxy based on location type and components
        place_type = self._classify_place_type(result)
        socioeconomic_proxy = self._infer_socioeconomic(result, postcode)

        return {
            "formatted_address": result.get("formatted_address", postcode),
            "socioeconomic_proxy": socioeconomic_proxy,
            "latitude": location["lat"],
            "longitude": location["lng"],
            "place_type": place_type,
        }

    def _classify_place_type(self, result: dict) -> str:
        """Classify the type of place."""
        types = result.get("types", [])
        if "postal_code" in types:
            return "postal_code"
        if "sublocality" in types:
            return "neighborhood"
        if "locality" in types:
            return "city"
        if "administrative_area" in types:
            return "region"
        return "other"

    def _infer_socioeconomic(self, result: dict, postcode: str) -> str:
        """Infer socioeconomic status from location data.

        This is a simplified heuristic. In production, you'd use:
        - Census data
        - Income statistics
        - Property values
        - Education levels
        """
        # Use postcode prefixes as a rough proxy (UK/India style)
        # This is placeholder logic - replace with actual data
        affluent_prefixes = [
            "500",  # Hyderabad wealthy areas
            "4000",  # South Mumbai
            "1100",  # South Delhi
            "5600",  # Bangalore wealthy areas
        ]
        low_income_prefixes = [
            "40001",  # North Mumbai
            "11005",  # East Delhi
            "5000",  # Some Hyderabad areas
        ]

        for prefix in affluent_prefixes:
            if postcode.startswith(prefix):
                return "affluent"

        for prefix in low_income_prefixes:
            if postcode.startswith(prefix):
                return "low_income"

        return "mixed"

    def find_neutral_postcode(self, reference_postcode: str) -> str:
        """Find a postcode with similar characteristics but different demographic.

        Used for generating shadow variants that swap socioeconomic context.
        """
        # Placeholder: return a different postcode in the same city
        # In production, use actual demographic data
        if reference_postcode.startswith("40001"):
            return "400050"  # Bandra (affluent)
        if reference_postcode.startswith("40005"):
            return "400017"  # Dadar (mixed)
        if reference_postcode.startswith("5600"):
            return "560095" if not reference_postcode.endswith("95") else "560001"
        if reference_postcode.startswith("1100"):
            return "110024" if not reference_postcode.endswith("24") else "110001"

        # Default: increment last digit
        try:
            base = reference_postcode[:-1]
            last_digit = int(reference_postcode[-1])
            return base + str((last_digit + 5) % 10)
        except (ValueError, IndexError):
            return reference_postcode


def init_external_services(settings: Settings) -> dict:
    """Initialize all external API clients."""
    services = {}

    if settings.firebase_service_account_json:
        services["nlp"] = LinguisticAnalyzer(settings)

    if settings.google_maps_api_key:
        services["maps"] = PostcodeAnalyzer(settings)

    return services
