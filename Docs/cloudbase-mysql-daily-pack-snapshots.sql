CREATE TABLE rulingo_daily_pack_snapshots (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner VARCHAR(128) NOT NULL,
  date_key DATE NOT NULL,
  schema_version VARCHAR(64) NOT NULL,
  pack_json JSON NOT NULL,
  generated_by VARCHAR(64) NOT NULL DEFAULT 'codex',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rulingo_daily_pack_owner_day (owner, date_key),
  KEY idx_rulingo_daily_pack_owner_date (owner, date_key),
  KEY idx_rulingo_daily_pack_date (date_key),
  KEY idx_rulingo_daily_pack_owner_updated (owner, updated_at)
);
