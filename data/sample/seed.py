from datetime import datetime, timedelta
from typing import Dict, Optional
import random
from jamii.models import User, Post, PostType, ContentMetrics, UserPreferences

USERS: Dict[str, User] = {}
POSTS: Dict[str, Post] = {}

COUNTRIES = ["KE", "NG", "ZA", "TZ", "GH", "ET", "UG", "SN"]
LANGUAGES = ["sw", "en", "yo", "ha", "zu", "am", "ig", "fr"]
CONTENT_TYPES = list(PostType)
CITIES = {
    "KE": ["Nairobi", "Mombasa", "Kisumu"],
    "NG": ["Lagos", "Abuja", "Kano"],
    "ZA": ["Cape Town", "Johannesburg", "Durban"],
    "TZ": ["Dar es Salaam", "Zanzibar", "Arusha"],
    "GH": ["Accra", "Kumasi", "Tamale"],
}


def generate_users(n: int = 50) -> Dict[str, User]:
    users = {}
    user_ids = [f"user_{i:03d}" for i in range(n)]
    for uid in user_ids:
        country = random.choice(COUNTRIES)
        lang = random.choice(LANGUAGES)
        cities = CITIES.get(country, ["Capital"])
        city = random.choice(cities)
        following = random.sample([u for u in user_ids if u != uid], k=min(10, n - 1))
        close_friends = random.sample(following, k=min(3, len(following)))
        communities = [f"community_{random.randint(0, 9)}" for _ in range(random.randint(1, 4))]
        prefs = UserPreferences(
            preferred_languages=[lang, "en"],
            preferred_content_types={ct.value: round(random.random(), 2) for ct in CONTENT_TYPES},
            location_country=country,
            location_city=city,
        )
        users[uid] = User(
            user_id=uid,
            username=f"@{uid}",
            language=lang,
            country=country,
            city=city,
            following=following,
            community_ids=communities,
            close_friends=close_friends,
            preferences=prefs,
        )
    return users


def generate_posts(users: Dict[str, User], n: int = 300) -> Dict[str, Post]:
    posts = {}
    user_list = list(users.values())
    for i in range(n):
        pid = f"post_{i:04d}"
        author = random.choice(user_list)
        hours_ago = random.uniform(0, 72)
        created_at = datetime.utcnow() - timedelta(hours=hours_ago)
        metrics = ContentMetrics(
            views=random.randint(0, 10000),
            likes=random.randint(0, 500),
            comments=random.randint(0, 100),
            shares=random.randint(0, 50),
            saves=random.randint(0, 80),
            completion_rate=round(random.random(), 2),
        )
        posts[pid] = Post(
            post_id=pid,
            author_id=author.user_id,
            author_community_ids=author.community_ids,
            content_type=random.choice(CONTENT_TYPES),
            language=author.language,
            country=author.country,
            city=author.city,
            hashtags=[f"#tag{random.randint(1, 20)}" for _ in range(random.randint(0, 3))],
            created_at=created_at,
            metrics=metrics,
            is_sponsored=random.random() < 0.03,
            is_community_post=random.random() < 0.4,
        )
    return posts


def seed() -> tuple:
    global USERS, POSTS
    USERS = generate_users(50)
    POSTS = generate_posts(USERS, 300)
    return USERS, POSTS


def get_user(user_id: str) -> Optional[User]:
    return USERS.get(user_id)


def get_post(post_id: str) -> Optional[Post]:
    return POSTS.get(post_id)
