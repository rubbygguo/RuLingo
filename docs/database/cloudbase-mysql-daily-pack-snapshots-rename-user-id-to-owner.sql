ALTER TABLE rulingo_daily_pack_snapshots
  DROP INDEX uniq_rulingo_daily_pack_user_day,
  DROP INDEX idx_rulingo_daily_pack_user_updated,
  CHANGE COLUMN user_id owner VARCHAR(128) NOT NULL,
  ADD UNIQUE KEY uniq_rulingo_daily_pack_owner_day (owner, date_key),
  ADD KEY idx_rulingo_daily_pack_owner_date (owner, date_key),
  ADD KEY idx_rulingo_daily_pack_owner_updated (owner, updated_at);
