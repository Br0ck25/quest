-- migrations/0003_multiplayer_rooms.sql — Phase 6 Multiplayer Co-op Schema
-- Records private room metadata and participant match history.

CREATE TABLE IF NOT EXISTS coop_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOBBY', -- 'LOBBY' | 'ENCOUNTER' | 'VICTORY' | 'DEFEATED' | 'EXPIRED'
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_coop_rooms_code ON coop_rooms(code);

CREATE TABLE IF NOT EXISTS coop_room_participants (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'host' | 'member'
  score INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES coop_rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_coop_participants_user ON coop_room_participants(user_id);
