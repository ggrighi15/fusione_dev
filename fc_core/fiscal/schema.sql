-- Fiscal and cadastro normalization base tables

CREATE TABLE IF NOT EXISTS cadastro_staging_pessoas (
  staging_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_system TEXT,
  external_id TEXT,
  nome_raw TEXT,
  documento_raw TEXT,
  email_raw TEXT,
  telefone_raw TEXT,
  endereco_raw TEXT,
  cidade_raw TEXT,
  uf_raw TEXT,
  cep_raw TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cadastro_normalizado_pessoas (
  person_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_system TEXT,
  external_id TEXT,
  nome_norm TEXT,
  documento_norm TEXT,
  documento_tipo TEXT,
  documento_valido INTEGER NOT NULL DEFAULT 0,
  email_norm TEXT,
  telefone_norm TEXT,
  endereco_norm TEXT,
  cidade_norm TEXT,
  uf_norm TEXT,
  cep_norm TEXT,
  dedupe_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_norm_pessoas_doc ON cadastro_normalizado_pessoas(documento_norm);
CREATE INDEX IF NOT EXISTS idx_norm_pessoas_dedupe ON cadastro_normalizado_pessoas(dedupe_key);

CREATE TABLE IF NOT EXISTS fiscal_item_staging (
  item_staging_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_system TEXT,
  sku_raw TEXT,
  descricao_raw TEXT,
  ncm_raw TEXT,
  unidade_raw TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fiscal_ncm_catalog (
  ncm_code TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  keywords TEXT,
  source_ref TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fiscal_item_ncm_suggestion (
  suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_staging_id INTEGER NOT NULL,
  sku_norm TEXT,
  ncm_suggested TEXT,
  score REAL NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  FOREIGN KEY(item_staging_id) REFERENCES fiscal_item_staging(item_staging_id)
);

CREATE INDEX IF NOT EXISTS idx_ncm_sugg_item ON fiscal_item_ncm_suggestion(item_staging_id);
CREATE INDEX IF NOT EXISTS idx_ncm_sugg_status ON fiscal_item_ncm_suggestion(status);

CREATE TABLE IF NOT EXISTS fiscal_item_ncm_final (
  final_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_staging_id INTEGER NOT NULL,
  ncm_final TEXT NOT NULL,
  decision_source TEXT NOT NULL,
  decision_by TEXT,
  decision_note TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY(item_staging_id) REFERENCES fiscal_item_staging(item_staging_id)
);

CREATE TABLE IF NOT EXISTS cadastro_change_log (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  rule_id TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_change_entity ON cadastro_change_log(entity_type, entity_key);
