-- migrations/0001_initial_schema.sql — D1 Database Schema Baseline
-- Governs pseudonymous players, KAAC curriculum concepts, attempt histories, and spaced repetition review tracking.

-- 1. Pseudonymous Users (Zero PII, COPPA compliant)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 1,
  grade_band TEXT NOT NULL DEFAULT '6-8',
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

-- 2. KAAC Curriculum Concepts
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  curriculum_code TEXT
);

-- 3. Stored Questions (Provenance & Rights-gated)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  concept_ids TEXT NOT NULL, -- JSON array of concept strings
  grade_band TEXT NOT NULL,
  prompt TEXT NOT NULL,
  choices TEXT NOT NULL,     -- JSON array of { id, text }
  answer_key TEXT NOT NULL,  -- Kept server-side only
  explanation TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  rights_status TEXT NOT NULL DEFAULT 'approved',
  review_status TEXT NOT NULL DEFAULT 'approved',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

-- 4. User Question Attempt History
CREATE TABLE IF NOT EXISTS user_question_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  selected_choice_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  assisted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  session_id TEXT,
  idempotency_key TEXT UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_concept ON user_question_attempts(user_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON user_question_attempts(user_id, created_at);

-- 5. User Concept Mastery & Spaced Repetition Scheduling
CREATE TABLE IF NOT EXISTS user_concept_mastery (
  user_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 1,
  due_at INTEGER NOT NULL,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  distinct_questions_correct TEXT NOT NULL DEFAULT '[]', -- JSON array of distinct question IDs
  is_mastered INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, concept_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_due ON user_concept_mastery(user_id, due_at);

-- 6. Wallet Ledger (Prepared for Phase 5 Economy, idempotent)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. User Cosmetic Inventory
CREATE TABLE IF NOT EXISTS user_inventory (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
