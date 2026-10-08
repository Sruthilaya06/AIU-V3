-- 20261005100000_correct_aiu_source_datatypes.sql
-- Enforce typed columns, indices, and validation constraints for V2 multi-identifier retrieval

-- Form Number must remain BIGINT
-- Identifiers remain TEXT (client_code, client_pan_number, user_mobile_number)
-- Dates remain DATE, Timestamps remain TIMESTAMPTZ

CREATE INDEX IF NOT EXISTS idx_user_address_mobile ON user_address_details (user_mobile_number);
CREATE INDEX IF NOT EXISTS idx_client_details_pan ON client_details (client_pan_number);
CREATE INDEX IF NOT EXISTS idx_user_account_client_code ON user_account_information (client_code);
CREATE INDEX IF NOT EXISTS idx_client_details_client_code ON client_details (client_code);
CREATE INDEX IF NOT EXISTS idx_user_account_form_number ON user_account_information (form_number);
CREATE INDEX IF NOT EXISTS idx_user_address_form_number ON user_address_details (form_number);
CREATE INDEX IF NOT EXISTS idx_user_personal_form_number ON user_personal_details (form_number);
CREATE INDEX IF NOT EXISTS idx_client_details_form_number ON client_details (form_number);
CREATE INDEX IF NOT EXISTS idx_user_personal_name ON user_personal_details (user_first_name, user_last_name);
