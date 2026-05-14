ALTER TABLE rulingo_memory_items
  CHANGE COLUMN owner_id owner VARCHAR(128) NOT NULL,
  DROP INDEX uniq_rulingo_memory_owner_fingerprint,
  DROP INDEX idx_rulingo_memory_owner_type,
  DROP INDEX idx_rulingo_memory_owner_base_form,
  DROP INDEX idx_rulingo_memory_owner_familiarity,
  DROP INDEX idx_rulingo_memory_owner_archived_review,
  DROP INDEX idx_rulingo_memory_owner_next_review,
  DROP INDEX idx_rulingo_memory_owner_last_seen,
  ADD UNIQUE KEY uniq_rulingo_memory_owner_fingerprint (owner, fingerprint),
  ADD KEY idx_rulingo_memory_owner_type (owner, type),
  ADD KEY idx_rulingo_memory_owner_base_form (owner, base_form),
  ADD KEY idx_rulingo_memory_owner_familiarity (owner, familiarity),
  ADD KEY idx_rulingo_memory_owner_archived_review (owner, is_archived, next_review_at),
  ADD KEY idx_rulingo_memory_owner_next_review (owner, next_review_at),
  ADD KEY idx_rulingo_memory_owner_last_seen (owner, last_seen_at);

ALTER TABLE rulingo_memory_item_tags
  CHANGE COLUMN owner_id owner VARCHAR(128) NOT NULL,
  DROP INDEX idx_rulingo_memory_tag_owner_category,
  DROP INDEX idx_rulingo_memory_tag_owner_key,
  ADD KEY idx_rulingo_memory_tag_owner_category (owner, category, tag_key),
  ADD KEY idx_rulingo_memory_tag_owner_key (owner, tag_key);
