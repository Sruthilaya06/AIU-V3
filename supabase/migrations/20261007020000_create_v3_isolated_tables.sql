-- ============================================================================
-- Migration: 20261007020000_create_v3_isolated_tables.sql
-- Description: AIU V3 Isolated 7-Table Relational Schema
-- Note: Completely isolated from existing V2 tables.
-- ============================================================================

-- Table 1: v3_user_details
-- Source name: User details
CREATE TABLE IF NOT EXISTS v3_user_details (
  user_id TEXT PRIMARY KEY,
  client_code TEXT UNIQUE NOT NULL,
  user_account_status_flag TEXT NOT NULL,
  user_update_date TIMESTAMPTZ NOT NULL,
  user_equity_allowed TEXT NOT NULL DEFAULT 'Y',
  user_mf_allowed TEXT NOT NULL DEFAULT 'Y',
  user_fno_allowed TEXT NOT NULL DEFAULT 'Y',
  user_commodity_allowed TEXT NOT NULL DEFAULT 'N',
  user_ipo_allowed TEXT NOT NULL DEFAULT 'Y',
  user_loan_allowed TEXT NOT NULL DEFAULT 'N',
  user_first_active_date DATE NOT NULL
);

-- Table 5: v3_client_details
-- Source name: Client Details
-- Note: Formed before child tables that reference form_number and client_code
CREATE TABLE IF NOT EXISTS v3_client_details (
  client_code TEXT PRIMARY KEY REFERENCES v3_user_details(client_code),
  form_number BIGINT UNIQUE NOT NULL,
  customer_type_individual_huf TEXT NOT NULL,
  client_inward_date DATE NOT NULL,
  client_scheme_type TEXT NOT NULL,
  client_inward_status TEXT NOT NULL,
  client_inward_accept_date DATE NOT NULL,
  client_agreement_date DATE NOT NULL,
  client_agent_code TEXT NOT NULL,
  client_sub_agent_code NUMERIC,
  client_product_type TEXT NOT NULL,
  client_icici_emp_number TEXT NOT NULL,
  client_receipt_date DATE NOT NULL,
  client_form_version TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES v3_user_details(user_id),
  client_web_user_id TEXT NOT NULL, -- EXPLICITLY NOT A FOREIGN KEY per V3 specification
  client_marital_status TEXT NOT NULL,
  client_education_code TEXT NOT NULL,
  client_income_category_code TEXT NOT NULL,
  client_holding_range_code TEXT NOT NULL,
  client_customer_nri_flag TEXT NOT NULL,
  client_form_60_flag TEXT NOT NULL,
  client_tax_assesse_flag TEXT NOT NULL,
  client_verification_date DATE NOT NULL,
  client_verify_status TEXT NOT NULL,
  client_ack_flag TEXT NOT NULL,
  client_ack_date DATE NOT NULL,
  client_send_mail_flag TEXT NOT NULL,
  client_eba_upload_flag TEXT NOT NULL,
  client_eba_upload_date DATE NOT NULL,
  client_last_flag TEXT NOT NULL,
  client_rejection_mail_remarks NUMERIC,
  client_details_entered_by NUMERIC,
  client_details_entry_date TIMESTAMPTZ NOT NULL,
  client_details_modified_by TEXT NOT NULL,
  client_details_modified_date TIMESTAMPTZ NOT NULL,
  client_pan_number TEXT NOT NULL,
  client_category_employee_code TEXT NOT NULL,
  client_rm_code TEXT NOT NULL,
  client_nri_category_type TEXT,
  client_nri_base_scheme TEXT,
  client_nri_current_scheme TEXT,
  client_non_isec_agent_code TEXT,
  client_customer_type_change_date DATE NOT NULL,
  client_bank_type TEXT NOT NULL,
  client_settlement_type TEXT NOT NULL,
  client_demat_mandate_category TEXT,
  client_brokerage_model_flag TEXT NOT NULL
);

-- Table 2: v3_user_account_information
-- Source name: User Account Information
CREATE TABLE IF NOT EXISTS v3_user_account_information (
  form_number BIGINT PRIMARY KEY REFERENCES v3_client_details(form_number),
  user_type_residential_nri TEXT NOT NULL,
  user_bank_account_number BIGINT NOT NULL,
  user_bank_customer_id TEXT NOT NULL,
  user_bank_brnch_code TEXT NOT NULL,
  user_bank_account_type_self_joint TEXT NOT NULL,
  user_bank_account_open_date DATE NOT NULL,
  client_code TEXT NOT NULL REFERENCES v3_user_details(client_code),
  user_demat_account_open_date DATE NOT NULL,
  user_info_entered_by TEXT NOT NULL,
  user_info_modified_by TEXT NOT NULL,
  user_info_modified_date TIMESTAMPTZ NOT NULL,
  user_bank_account_flag TEXT NOT NULL,
  user_bank_type TEXT NOT NULL
);

-- Table 3: v3_user_address_details
-- Source name: User Address Details
CREATE TABLE IF NOT EXISTS v3_user_address_details (
  form_number BIGINT PRIMARY KEY REFERENCES v3_client_details(form_number),
  address_type_correspondance_permanent TEXT NOT NULL,
  address_1 TEXT NOT NULL,
  address_2 TEXT NOT NULL,
  user_city TEXT NOT NULL,
  user_state TEXT NOT NULL,
  user_country TEXT NOT NULL,
  user_pin INTEGER NOT NULL,
  user_telephone_number BIGINT NOT NULL,
  user_office_number BIGINT NOT NULL,
  user_mobile_number BIGINT NOT NULL,
  user_mail_address_flag TEXT NOT NULL,
  user_details_entered_by TEXT NOT NULL,
  user_details_entry_date TIMESTAMPTZ NOT NULL,
  user_details_modified_by TEXT NOT NULL,
  user_details_modified_date TIMESTAMPTZ NOT NULL,
  user_address_same_as_correspondance TEXT NOT NULL,
  user_ip TEXT NOT NULL,
  user_mobile_relation TEXT NOT NULL,
  user_rm_preferred_location_pin INTEGER NOT NULL
);

-- Table 4: v3_user_personal_details
-- Source name: User Personal Details
CREATE TABLE IF NOT EXISTS v3_user_personal_details (
  form_number BIGINT PRIMARY KEY REFERENCES v3_client_details(form_number),
  user_type_applicant_permanent TEXT NOT NULL,
  user_first_name TEXT NOT NULL,
  user_middle_name TEXT,
  user_last_name TEXT NOT NULL,
  user_dob DATE NOT NULL,
  user_sex TEXT NOT NULL,
  user_minor_flag TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_country_birth TEXT NOT NULL,
  user_nationality TEXT NOT NULL,
  user_entered_employee_number TEXT NOT NULL,
  user_details_entered_date TIMESTAMPTZ NOT NULL,
  user_details_modified_employee_number TEXT NOT NULL,
  userd_details_modified_date TIMESTAMPTZ NOT NULL,
  user_designation TEXT NOT NULL,
  user_relation TEXT NOT NULL,
  user_user_id TEXT NOT NULL REFERENCES v3_user_details(user_id),
  user_income_category TEXT NOT NULL,
  user_marital_status TEXT NOT NULL,
  user_political_connect TEXT NOT NULL,
  user_inperson_verification_date DATE NOT NULL,
  user_customer_type TEXT NOT NULL,
  user_update_ip TEXT NOT NULL,
  user_update_channel TEXT NOT NULL,
  user_us_person TEXT NOT NULL,
  user_tax_filing_country TEXT NOT NULL,
  user_place_of_birth TEXT NOT NULL,
  user_email_relation TEXT NOT NULL,
  user_aadhar_last_4_digit INTEGER NOT NULL,
  user_name_as_per_aadhar TEXT NOT NULL,
  user_aadhar_status TEXT NOT NULL,
  user_aadhar_consent_flag TEXT NOT NULL
);

-- Table 6: v3_order_details_equity
-- Source name: 6. Order Details(Equity)
CREATE TABLE IF NOT EXISTS v3_order_details_equity (
  order_reference TEXT PRIMARY KEY,
  client_code TEXT NOT NULL REFERENCES v3_client_details(client_code),
  order_exchange_code TEXT NOT NULL,
  order_stock_code TEXT NOT NULL,
  order_exchange_segment_code TEXT NOT NULL,
  order_flow_buy_sell TEXT NOT NULL,
  order_product_type TEXT NOT NULL,
  order_quantity INTEGER NOT NULL,
  order_exchange_segment_settlement INTEGER NOT NULL,
  order_lmt_market_flag TEXT NOT NULL,
  order_lmt_rate NUMERIC(14, 4) NOT NULL,
  order_disclosed_quantity INTEGER NOT NULL,
  order_status TEXT NOT NULL,
  order_trade_date DATE NOT NULL,
  order_ack_number TEXT NOT NULL,
  order_executed_quantity INTEGER NOT NULL,
  order_amount_blocked NUMERIC(16, 4) NOT NULL,
  order_brokerage_value NUMERIC(14, 4) NOT NULL,
  order_isin_number TEXT NOT NULL,
  order_placed_status TEXT NOT NULL,
  order_quantity_blocked INTEGER NOT NULL,
  order_margin_percentage NUMERIC(8, 4) NOT NULL,
  order_exchange_user_id INTEGER NOT NULL,
  order_btst_settlement_number INTEGER NOT NULL,
  order_btst_segment_code TEXT NOT NULL,
  order_channel TEXT NOT NULL,
  order_margin_square_off_mode TEXT NOT NULL,
  order_cancel_quantity INTEGER NOT NULL,
  order_type TEXT NOT NULL,
  order_valid_date DATE NOT NULL,
  order_cal_flag TEXT NOT NULL,
  order_exchange_ack TEXT NOT NULL,
  order_trade_value NUMERIC(16, 4) NOT NULL,
  order_date DATE NOT NULL
);

-- Table 7: v3_trade_details_equity
-- Source name: 7. Trade Details(Equity)
CREATE TABLE IF NOT EXISTS v3_trade_details_equity (
  trade_reference TEXT PRIMARY KEY,
  client_code TEXT NOT NULL REFERENCES v3_client_details(client_code),
  trade_exchange_code TEXT NOT NULL,
  trade_stock_code TEXT NOT NULL,
  trade_exchange_segment_code TEXT NOT NULL,
  trade_exchange_segment_settlement INTEGER NOT NULL,
  trade_order_reference TEXT NOT NULL REFERENCES v3_order_details_equity(order_reference),
  trade_date DATE NOT NULL,
  trade_transaction_type TEXT NOT NULL,
  trade_flow_buy_sell TEXT NOT NULL,
  trade_executed_quantity INTEGER NOT NULL,
  trade_executed_rate NUMERIC(14, 4) NOT NULL,
  trade_value NUMERIC(16, 4) NOT NULL,
  trade_brokerage_value NUMERIC(14, 4) NOT NULL,
  trade_net_value NUMERIC(16, 4) NOT NULL,
  trade_amount_blocked NUMERIC(16, 4) NOT NULL,
  trade_exchange_reference BIGINT NOT NULL,
  trade_upload_match_flag TEXT NOT NULL,
  trade_contract_number TEXT NOT NULL,
  trade_brokerage_flag TEXT NOT NULL,
  trade_sebi_charge_value NUMERIC(14, 4) NOT NULL,
  trade_user_id TEXT NOT NULL,
  trade_transaction_charge NUMERIC(14, 4) NOT NULL
);

-- ============================================================================
-- V3 INDEXES
-- Supports client filtering, date filtering, joins, latest N, top N, aggregations
-- ============================================================================

-- Client Code & User ID foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_v3_uai_client_code ON v3_user_account_information (client_code);
CREATE INDEX IF NOT EXISTS idx_v3_upd_user_id ON v3_user_personal_details (user_user_id);
CREATE INDEX IF NOT EXISTS idx_v3_cd_user_id ON v3_client_details (client_user_id);
CREATE INDEX IF NOT EXISTS idx_v3_cd_form_number ON v3_client_details (form_number);

-- Order indexes for client filtering, date ranges, and joins
CREATE INDEX IF NOT EXISTS idx_v3_orders_client_code ON v3_order_details_equity (client_code);
CREATE INDEX IF NOT EXISTS idx_v3_orders_order_date ON v3_order_details_equity (order_date);
CREATE INDEX IF NOT EXISTS idx_v3_orders_trade_date ON v3_order_details_equity (order_trade_date);

-- Trade indexes for client filtering, order reference join, and date ranges
CREATE INDEX IF NOT EXISTS idx_v3_trades_client_code ON v3_trade_details_equity (client_code);
CREATE INDEX IF NOT EXISTS idx_v3_trades_order_ref ON v3_trade_details_equity (trade_order_reference);
CREATE INDEX IF NOT EXISTS idx_v3_trades_trade_date ON v3_trade_details_equity (trade_date);

-- Composite index optimized for latest N trades per client
CREATE INDEX IF NOT EXISTS idx_v3_trades_client_date_desc ON v3_trade_details_equity (client_code, trade_date DESC);
