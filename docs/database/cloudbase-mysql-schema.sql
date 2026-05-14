CREATE TABLE rulingo_daily_task_completions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(128) NOT NULL,
  date_key DATE NOT NULL,
  category_id VARCHAR(64) NOT NULL,
  task_id VARCHAR(64) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rulingo_user_task_day (user_id, date_key, category_id, task_id),
  KEY idx_rulingo_user_date (user_id, date_key)
);
