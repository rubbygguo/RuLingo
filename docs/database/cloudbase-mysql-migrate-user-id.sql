ALTER TABLE rulingo_daily_task_completions
  ADD COLUMN user_id VARCHAR(128) NULL AFTER id;

UPDATE rulingo_daily_task_completions
SET user_id = _openid
WHERE user_id IS NULL AND _openid IS NOT NULL;

ALTER TABLE rulingo_daily_task_completions
  MODIFY user_id VARCHAR(128) NOT NULL,
  DROP INDEX uniq_rulingo_user_task_day,
  DROP INDEX idx_rulingo_user_date,
  ADD UNIQUE KEY uniq_rulingo_user_task_day (user_id, date_key, category_id, task_id),
  ADD KEY idx_rulingo_user_date (user_id, date_key);
