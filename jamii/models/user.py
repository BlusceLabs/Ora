from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime


@dataclass
class UserPreferences:
    preferred_languages: List[str] = field(default_factory=lambda: ["en"])
    preferred_content_types: Dict[str, float] = field(default_factory=dict)
    location_country: Optional[str] = None
    location_city: Optional[str] = None


@dataclass
class User:
    user_id: str
    username: str
    language: str
    country: str
    city: Optional[str]
    following: List[str] = field(default_factory=list)
    community_ids: List[str] = field(default_factory=list)
    close_friends: List[str] = field(default_factory=list)
    preferences: UserPreferences = field(default_factory=UserPreferences)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_active: datetime = field(default_factory=datetime.utcnow)

    def relationship_strength(self, author_id: str) -> float:
        if author_id in self.close_friends:
            return 1.0
        if author_id in self.following:
            return 0.6
        return 0.0

    def shares_community(self, author_community_ids: List[str]) -> bool:
        return bool(set(self.community_ids) & set(author_community_ids))
