PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS circularization_cycle (
  cycle_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  quarter TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED'))
);

CREATE TABLE IF NOT EXISTS circularization_recipient (
  recipient_id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  recipient_key TEXT NOT NULL,
  cliente TEXT NOT NULL,
  escritorio TEXT NOT NULL,
  email TEXT NOT NULL,
  owner TEXT NOT NULL,
  escopo TEXT NOT NULL,
  status TEXT NOT NULL,
  last_event_at TEXT,
  next_action_at TEXT,
  notes TEXT,
  FOREIGN KEY(cycle_id) REFERENCES circularization_cycle(cycle_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipient_cycle_key
  ON circularization_recipient(cycle_id, recipient_key);

CREATE TABLE IF NOT EXISTS circularization_message (
  msg_id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('OUT','IN')),
  provider_message_id TEXT,
  subject TEXT,
  sent_at TEXT,
  received_at TEXT,
  hash_body TEXT,
  fingerprint TEXT,
  raw_storage_ref TEXT,
  confidence REAL,
  FOREIGN KEY(cycle_id) REFERENCES circularization_cycle(cycle_id),
  FOREIGN KEY(recipient_id) REFERENCES circularization_recipient(recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_cycle_recipient
  ON circularization_message(cycle_id, recipient_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_cycle_raw
  ON circularization_message(cycle_id, raw_storage_ref);

CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_cycle_fingerprint
  ON circularization_message(cycle_id, fingerprint);

CREATE TABLE IF NOT EXISTS circularization_attachment (
  att_id TEXT PRIMARY KEY,
  msg_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  pages INTEGER,
  text_extracted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(msg_id) REFERENCES circularization_message(msg_id)
);

CREATE INDEX IF NOT EXISTS idx_att_msg
  ON circularization_attachment(msg_id);

CREATE TABLE IF NOT EXISTS circularization_audit_dispatch (
  audit_id TEXT PRIMARY KEY,
  msg_id TEXT NOT NULL,
  audit_copy_method TEXT NOT NULL,
  audit_delivered_at TEXT,
  audit_delivery_ok INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(msg_id) REFERENCES circularization_message(msg_id)
);

CREATE INDEX IF NOT EXISTS idx_aud_msg
  ON circularization_audit_dispatch(msg_id);

CREATE TABLE IF NOT EXISTS reconciliation_issue (
  issue_id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(cycle_id) REFERENCES circularization_cycle(cycle_id),
  FOREIGN KEY(recipient_id) REFERENCES circularization_recipient(recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_cycle_code
  ON reconciliation_issue(cycle_id, code);
