"""
Feed simulation script.
Generates sample users and posts, builds feeds, and prints results.
Run with: python scripts/simulate.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import logging
from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.signals import EventTracker
from jamii.models import Event, EventType

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")


def run():
    print("\n=== Jamii Feed Algorithm Simulation ===\n")

    users, posts = seed()
    print(f"Generated {len(users)} users and {len(posts)} posts\n")

    pipeline = FeedPipeline(post_store=posts)
    tracker = EventTracker()

    sample_users = random.sample(list(users.values()), 3)

    for user in sample_users:
        print(f"--- Feed for {user.username} ({user.language} | {user.country} | {user.city}) ---")
        feed = pipeline.build_feed(user, feed_size=10)

        if not feed:
            print("  (empty feed)\n")
            continue

        for i, post in enumerate(feed, 1):
            rel = "close friend" if post.author_id in user.close_friends else \
                  "following" if post.author_id in user.following else \
                  "community" if user.shares_community(post.author_community_ids) else "discovery"
            print(
                f"  {i:2}. [{post.content_type.value:6}] post={post.post_id} "
                f"author={post.author_id} lang={post.language} "
                f"recency={round(post.recency_score(), 2)} "
                f"engagement={round(post.metrics.engagement_score, 4)} "
                f"({rel})"
            )

        event = Event(
            event_id=f"evt_{user.user_id}_0",
            user_id=user.user_id,
            post_id=feed[0].post_id,
            event_type=EventType.LIKE,
        )
        tracker.track(event, author_id=feed[0].author_id, content_type=feed[0].content_type.value)
        print(f"  -> Simulated LIKE on {feed[0].post_id}")
        print()

    print(f"Total events tracked: {tracker.total_events()}")
    print("\n=== Done ===\n")


if __name__ == "__main__":
    run()
