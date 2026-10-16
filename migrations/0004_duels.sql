-- migrations/0004_duels.sql — Phase 7 1v1 Knowledge Duels Schema
-- Tracks 1v1 private-code duel matches and per-round responses with delayed answer reveals.

CREATE TABLE IF NOT EXISTS duel_matches (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  player1_id TEXT NOT NULL,
  player2_id TEXT,
  player1_handle TEXT NOT NULL,
  player2_handle TEXT,
  status TEXT NOT NULL DEFAULT 'LOBBY',
  winner_id TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_duel_matches_code ON duel_matches(code);

CREATE TABLE IF NOT EXISTS duel_rounds (
  match_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  player1_choice TEXT,
  player1_time_ms INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_choice TEXT,
  player2_time_ms INTEGER,
  player2_score INTEGER DEFAULT 0,
  revealed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, round_number),
  FOREIGN KEY (match_id) REFERENCES duel_matches(id)
);

CREATE INDEX IF NOT EXISTS idx_duel_rounds_match ON duel_rounds(match_id);
