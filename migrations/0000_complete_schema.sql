CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 1,
  grade_band TEXT NOT NULL DEFAULT '6-8',
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  curriculum_code TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  concept_ids TEXT NOT NULL,
  grade_band TEXT NOT NULL,
  prompt TEXT NOT NULL,
  choices TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  rights_status TEXT NOT NULL DEFAULT 'approved',
  review_status TEXT NOT NULL DEFAULT 'approved',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

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

CREATE TABLE IF NOT EXISTS user_concept_mastery (
  user_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 1,
  due_at INTEGER NOT NULL,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  distinct_questions_correct TEXT NOT NULL DEFAULT '[]',
  is_mastered INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, concept_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_due ON user_concept_mastery(user_id, due_at);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_inventory (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_progression (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  equipped_companion_id TEXT NOT NULL DEFAULT 'companion_cardinal',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_quests (
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  progress TEXT NOT NULL DEFAULT '',
  claimed_at INTEGER,
  PRIMARY KEY (user_id, quest_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);

CREATE TABLE IF NOT EXISTS coop_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOBBY',
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_coop_rooms_code ON coop_rooms(code);

CREATE TABLE IF NOT EXISTS coop_room_participants (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  score INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES coop_rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_coop_participants_user ON coop_room_participants(user_id);

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
