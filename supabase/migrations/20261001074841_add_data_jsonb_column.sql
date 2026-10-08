-- 20261001074841_add_data_jsonb_column.sql
-- Add JSONB source row column to all 5 AIU tables for complete source row preservation

ALTER TABLE user_details ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE user_account_information ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE user_address_details ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE user_personal_details ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS data JSONB;
