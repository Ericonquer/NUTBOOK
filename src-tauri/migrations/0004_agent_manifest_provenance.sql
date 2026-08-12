ALTER TABLE artifact_candidate_evidence
  ADD COLUMN skill_normalized_name TEXT;

ALTER TABLE artifact_candidate_evidence
  ADD COLUMN skill_display_name TEXT;

ALTER TABLE artifact_candidate_evidence
  ADD COLUMN manifest_entry_id TEXT;

ALTER TABLE artifact_candidate_evidence
  ADD COLUMN edit_contract TEXT;

ALTER TABLE artifact_candidate_evidence
  ADD COLUMN save_policy TEXT;

ALTER TABLE item_provenance
  ADD COLUMN manifest_entry_id TEXT;

ALTER TABLE item_provenance
  ADD COLUMN edit_contract TEXT;

ALTER TABLE item_provenance
  ADD COLUMN save_policy TEXT;
