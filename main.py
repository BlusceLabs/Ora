import logging
import uvicorn
from fastapi import FastAPI
from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.api.feed import router, set_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="Jamii Feed Algorithm API",
    description="Personalized feed pipeline for the Jamii super-app.",
    version="0.1.0",
)

app.include_router(router)


@app.on_event("startup")
def startup():
    logging.info("Seeding sample data...")
    users, posts = seed()
    logging.info(f"Seeded {len(users)} users, {len(posts)} posts")
    pipeline = FeedPipeline(post_store=posts)
    set_pipeline(pipeline)
    logging.info("Feed pipeline ready.")


@app.get("/")
def root():
    return {
        "app": "Jamii Feed Algorithm",
        "version": "0.1.0",
        "endpoints": {
            "feed": "POST /feed/",
            "health": "GET /feed/health",
            "docs": "GET /docs",
        },
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
