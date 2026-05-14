CREATE TABLE rulingo_daily_pack_responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner VARCHAR(128) NOT NULL,
  date_key DATE NOT NULL,
  response_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rulingo_daily_pack_response_owner_day (owner, date_key),
  KEY idx_rulingo_daily_pack_response_owner_date (owner, date_key),
  KEY idx_rulingo_daily_pack_response_owner_updated (owner, updated_at)
);
