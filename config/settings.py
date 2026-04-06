import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
FEED_CACHE_TTL = int(os.getenv("FEED_CACHE_TTL", 300))
FEED_SIZE = int(os.getenv("FEED_SIZE", 50))
CANDIDATE_POOL_SIZE = int(os.getenv("CANDIDATE_POOL_SIZE", 500))
MAX_CONSECUTIVE_SAME_AUTHOR = int(os.getenv("MAX_CONSECUTIVE_SAME_AUTHOR", 2))
DIVERSITY_INJECT_INTERVAL = int(os.getenv("DIVERSITY_INJECT_INTERVAL", 10))

RANKING_WEIGHTS = {
    "relationship_strength": 0.30,
    "recency": 0.25,
    "engagement_velocity": 0.20,
    "content_type_affinity": 0.10,
    "language_match": 0.10,
    "location_proximity": 0.05,
}

SUPPORTED_LANGUAGES = ["en", "sw", "ha", "yo", "zu", "am", "ig", "fr", "ar"]
