import logging
import uvicorn
from fastapi import FastAPI
from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.graph import RealGraph, UserReputation, SocialProofIndex, InteractionGraph
from jamii.safety import TrustAndSafetyFilter
from jamii.embeddings import SimClusters, TopicEmbeddings
from jamii.api.feed import router, set_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="Jamii Feed Algorithm API",
    description=(
        "Personalized feed pipeline for Jamii — Africa-first super-app. "
        "Architecture inspired by Twitter/the-algorithm and xai-org/x-algorithm."
    ),
    version="0.2.0",
)

app.include_router(router)


@app.on_event("startup")
def startup():
    logging.info("Seeding sample data...")
    users, posts = seed()
    logging.info(f"Seeded {len(users)} users, {len(posts)} posts")

    logging.info("Initializing graph components...")
    real_graph = RealGraph()
    reputation = UserReputation()
    social_proof = SocialProofIndex()
    interaction_graph = InteractionGraph()

    follow_graph = {uid: u.following for uid, u in users.items()}
    reputation.compute(follow_graph)
    logging.info("PageRank reputation computed")

    for user in users.values():
        for pid in list(posts.keys())[:5]:
            interaction_graph.add_edge(user.user_id, pid)
    logging.info(f"Interaction graph: {interaction_graph.total_edges()} edges")

    logging.info("Building SimClusters embeddings...")
    sim_clusters = SimClusters(n_communities=100)
    sim_clusters.fit(users, posts)
    logging.info("SimClusters fitted")

    topic_embeddings = TopicEmbeddings()
    for post in posts.values():
        topic_embeddings.tag_post(post)
    logging.info("Topic embeddings tagged")

    trust_safety = TrustAndSafetyFilter()

    pipeline = FeedPipeline(
        post_store=posts,
        real_graph=real_graph,
        reputation=reputation,
        social_proof=social_proof,
        interaction_graph=interaction_graph,
        trust_safety=trust_safety,
        sim_clusters=sim_clusters,
        topic_embeddings=topic_embeddings,
    )
    set_pipeline(pipeline)
    logging.info("Feed pipeline ready — all components initialized.")


@app.get("/")
def root():
    return {
        "app": "Jamii Feed Algorithm",
        "version": "0.2.0",
        "pipeline_stages": [
            "1. Query Hydration (user context)",
            "2. Candidate Sourcing (following, community, trending, graph traversal, discovery)",
            "3. Candidate Hydration (author reputation, social proof, topics)",
            "4. Trust & Safety Filter",
            "5. Social Proof Filter",
            "6. Light Ranking (fast pre-rank with engagement weights)",
            "7. Heavy Ranking (Real Graph + SimClusters + Topic Affinity + PageRank)",
            "8. Diversity Scoring (50% following / 30% community / 10% trending / 10% discovery)",
            "9. Feed Filter (max consecutive same author, discovery injection)",
            "10. Cache (Redis)",
        ],
        "endpoints": {
            "feed": "POST /feed/",
            "health": "GET /feed/health",
            "docs": "GET /docs",
        },
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
