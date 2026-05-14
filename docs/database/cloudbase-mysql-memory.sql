CREATE TABLE rulingo_memory_items (
  id VARCHAR(64) PRIMARY KEY,
  owner VARCHAR(128) NOT NULL,

  type VARCHAR(32) NOT NULL,
  canonical_text VARCHAR(255) NOT NULL,
  display_text VARCHAR(255) NOT NULL,
  normalized_text VARCHAR(255) NOT NULL,
  fingerprint VARCHAR(255) NOT NULL,

  base_form VARCHAR(255) NULL,
  word_form VARCHAR(64) NULL,

  meaning_zh TEXT NULL,
  explanation_en TEXT NULL,

  familiarity VARCHAR(32) NOT NULL DEFAULT 'new',
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  next_review_at DATETIME NULL,
  last_reviewed_at DATETIME NULL,
  success_count INT NOT NULL DEFAULT 0,
  fail_count INT NOT NULL DEFAULT 0,

  source_kind VARCHAR(32) NULL,
  first_seen_at DATETIME NULL,
  last_seen_at DATETIME NULL,

  search_text TEXT NULL,
  details JSON NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_rulingo_memory_owner_fingerprint (owner, fingerprint),
  KEY idx_rulingo_memory_owner_type (owner, type),
  KEY idx_rulingo_memory_owner_base_form (owner, base_form),
  KEY idx_rulingo_memory_owner_familiarity (owner, familiarity),
  KEY idx_rulingo_memory_owner_archived_review (owner, is_archived, next_review_at),
  KEY idx_rulingo_memory_owner_next_review (owner, next_review_at),
  KEY idx_rulingo_memory_owner_last_seen (owner, last_seen_at),
  FULLTEXT KEY ft_rulingo_memory_search (
    canonical_text,
    display_text,
    meaning_zh,
    explanation_en,
    search_text
  )
);

CREATE TABLE rulingo_memory_item_tags (
  owner VARCHAR(128) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  tag_key VARCHAR(64) NOT NULL,
  display_name VARCHAR(64) NOT NULL,

  PRIMARY KEY (item_id, category, tag_key),
  KEY idx_rulingo_memory_tag_owner_category (owner, category, tag_key),
  KEY idx_rulingo_memory_tag_owner_key (owner, tag_key),
  KEY idx_rulingo_memory_tag_item (item_id)
);
