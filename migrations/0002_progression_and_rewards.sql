-- migrations/0002_progression_and_rewards.sql — Phase 5 Progression & Rewards Schema
-- Adds server-authoritative user progression and quest completion tracking.

-- 1. User Progression (Server-authoritative Level, Adventure XP, and Companion)
CREATE TABLE IF NOT EXISTS user_progression (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  equipped_companion_id TEXT NOT NULL DEFAULT 'companion_cardinal',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. User Quests State & Reward Claims (Idempotent completion tracking)
CREATE TABLE IF NOT EXISTS user_quests (
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'active' | 'completed'
  progress TEXT NOT NULL DEFAULT '',
  claimed_at INTEGER,
  PRIMARY KEY (user_id, quest_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
