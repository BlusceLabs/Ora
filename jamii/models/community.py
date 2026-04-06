from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


@dataclass
class Community:
    community_id: str
    name: str
    language: str
    country: str
    member_ids: List[str] = field(default_factory=list)
    post_ids: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    is_public: bool = True

    @property
    def member_count(self) -> int:
        return len(self.member_ids)

    def is_member(self, user_id: str) -> bool:
        return user_id in self.member_ids
