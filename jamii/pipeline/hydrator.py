"""
Candidate Hydrator — enriches candidates with additional metadata after sourcing.
Inspired by X-algorithm's candidate_hydrators and query_hydrators.

Query Hydration: Fetches user context before pipeline starts.
  - User engagement history
  - Real Graph top authors
  - User reputation score

Candidate Hydration: Enriches each post after sourcing.
  - Author reputation
  - Social proof score
  - Topic tags
  - SimCluster embedding similarity
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from jamii.models import User, Post
from jamii.graph.real_graph import RealGraph
from jamii.graph.social_proof import SocialProofIndex
from jamii.graph.page_rank import UserReputation
from jamii.embeddings.topic_embeddings import TopicEmbeddings


@dataclass
class UserContext:
    user_id: str
    top_authors: Dict[str, float]
    reputation_score: float
    topic_interests: List


class QueryHydrator:
    """
    Fetches and assembles user context before candidate sourcing begins.
    This avoids repeated lookups during ranking.
    """

    def __init__(
        self,
        real_graph: Optional[RealGraph] = None,
        reputation: Optional[UserReputation] = None,
        topic_embeddings: Optional[TopicEmbeddings] = None,
    ):
        self.real_graph = real_graph or RealGraph()
        self.reputation = reputation or UserReputation()
        self.topic_embeddings = topic_embeddings

    def hydrate(self, user: User) -> UserContext:
        top_authors = self.real_graph.top_authors(user.user_id, top_k=50)
        rep_score = self.reputation.get(user.user_id, 0.5)
        interests = []
        if self.topic_embeddings:
            interests = self.topic_embeddings.top_interests(user.user_id, top_k=5)
        return UserContext(
            user_id=user.user_id,
            top_authors=top_authors,
            reputation_score=rep_score,
            topic_interests=interests,
        )


@dataclass
class HydratedPost:
    post: Post
    author_reputation: float
    social_proof_score: float
    topic_tags: List[str]


class CandidateHydrator:
    """
    Enriches each candidate post with metadata after sourcing.
    """

    def __init__(
        self,
        reputation: Optional[UserReputation] = None,
        social_proof: Optional[SocialProofIndex] = None,
        topic_embeddings: Optional[TopicEmbeddings] = None,
    ):
        self.reputation = reputation or UserReputation()
        self.social_proof = social_proof or SocialProofIndex()
        self.topic_embeddings = topic_embeddings

    def hydrate(self, user: User, posts: List[Post]) -> List[HydratedPost]:
        hydrated = []
        for post in posts:
            author_rep = self.reputation.get(post.author_id, 0.5)
            sp_score = self.social_proof.social_proof_score(
                post.post_id, user.following, user.close_friends
            )
            topics = []
            if self.topic_embeddings:
                topics = self.topic_embeddings.tag_post(post)
            hydrated.append(HydratedPost(
                post=post,
                author_reputation=author_rep,
                social_proof_score=sp_score,
                topic_tags=topics,
            ))
        return hydrated
