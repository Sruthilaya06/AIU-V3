// src/components/v3/v3FieldCatalog.ts
// Authoritative Output Field Catalog for AIU V3
// Derived from v3_schema.ts with explicit field display types and formatting definitions

export type V3FieldDisplayType =
  | 'identifier'
  | 'text'
  | 'date'
  | 'timestamp'
  | 'currency'
  | 'integer'
  | 'boolean';

export interface V3CatalogField {
  id: string;
  name: string;
  description: string;
  table: string;
  category: 'client' | 'user' | 'order' | 'trade' | 'computed';
  displayType: V3FieldDisplayType;
  isKey?: boolean;
}

export const V3_CATEGORIES = [
  { id: 'client', label: 'Client Information', description: 'Client codes, inward KYC, PAN, and account scheme models' },
  { id: 'trade', label: 'Trade Information', description: 'Executed trade records, charges, brokerages, and contract details' },
  { id: 'computed', label: 'Computed Metrics', description: 'Aggregated metrics (Trade Count, Total Trade Value, Avg Trade Value, Peak Trade Value)' },
  { id: 'order', label: 'Order Information', description: 'Equity order placements, limit rates, quantities, and statuses' },
  { id: 'user', label: 'User Information', description: 'User account profiles, demographic information, and addresses' },
] as const;

export const V3_ALL_FIELDS: V3CatalogField[] = [
  // Client Information
  { id: 'client_code', name: 'Client Code', description: 'Unique Client Identifier (e.g. CL00101)', table: 'v3_client_details', category: 'client', displayType: 'identifier', isKey: true },
  { id: 'customer_type_individual_huf', name: 'Client Type', description: 'INDIVIDUAL or HUF classification', table: 'v3_client_details', category: 'client', displayType: 'text' },
  { id: 'client_pan_number', name: 'PAN Number', description: 'Income Tax PAN code', table: 'v3_client_details', category: 'client', displayType: 'identifier' },
  { id: 'form_number', name: 'Form Number', description: 'Registration Form Identifier (TEXT)', table: 'v3_client_details', category: 'client', displayType: 'identifier', isKey: true },
  { id: 'client_verify_status', name: 'Verification Status', description: 'Client verification outcome', table: 'v3_client_details', category: 'client', displayType: 'boolean' },
  { id: 'client_scheme_type', name: 'Scheme Type', description: 'Brokerage plan & subscription', table: 'v3_client_details', category: 'client', displayType: 'text' },
  { id: 'client_brokerage_model_flag', name: 'Brokerage Model', description: 'Brokerage pricing tier', table: 'v3_client_details', category: 'client', displayType: 'text' },

  // Computed / Aggregated Query Metrics
  { id: 'trade_count', name: 'Trade Count', description: 'Total count of executed trades [COUNT]', table: 'v3_trade_details_equity', category: 'computed', displayType: 'integer' },
  { id: 'total_trade_value', name: 'Total Trade Value', description: 'Sum of all executed trade value in INR [SUM]', table: 'v3_trade_details_equity', category: 'computed', displayType: 'currency' },
  { id: 'avg_trade_value', name: 'Average Trade Value', description: 'Average executed trade value in INR [AVG]', table: 'v3_trade_details_equity', category: 'computed', displayType: 'currency' },
  { id: 'max_trade_value', name: 'Highest Trade Value', description: 'Peak executed trade value in INR [MAX]', table: 'v3_trade_details_equity', category: 'computed', displayType: 'currency' },
  { id: 'min_trade_value', name: 'Lowest Trade Value', description: 'Minimum executed trade value in INR [MIN]', table: 'v3_trade_details_equity', category: 'computed', displayType: 'currency' },

  // User Information
  { id: 'user_id', name: 'User ID', description: 'User login identity token', table: 'v3_user_details', category: 'user', displayType: 'identifier', isKey: true },
  { id: 'user_first_name', name: 'First Name', description: 'Applicant first name', table: 'v3_user_personal_details', category: 'user', displayType: 'text' },
  { id: 'user_last_name', name: 'Last Name', description: 'Applicant last name', table: 'v3_user_personal_details', category: 'user', displayType: 'text' },
  { id: 'user_email', name: 'Email Address', description: 'Primary email address', table: 'v3_user_personal_details', category: 'user', displayType: 'text' },
  { id: 'user_mobile_number', name: 'Phone Number', description: 'Registered mobile number (TEXT)', table: 'v3_user_address_details', category: 'user', displayType: 'identifier' },
  { id: 'user_city', name: 'City', description: 'Registered address city', table: 'v3_user_address_details', category: 'user', displayType: 'text' },
  { id: 'user_account_status_flag', name: 'Account Status', description: 'ACTIVE or INACTIVE status flag', table: 'v3_user_details', category: 'user', displayType: 'boolean' },

  // Order Information
  { id: 'order_reference', name: 'Order Reference', description: 'Exchange Order ID (e.g. ORD_000001)', table: 'v3_order_details_equity', category: 'order', displayType: 'identifier', isKey: true },
  { id: 'order_date', name: 'Order Date', description: 'Date order was placed', table: 'v3_order_details_equity', category: 'order', displayType: 'date' },
  { id: 'order_trade_date', name: 'Order Trade Date', description: 'Execution settlement trade date', table: 'v3_order_details_equity', category: 'order', displayType: 'date' },
  { id: 'order_status', name: 'Order Status', description: 'EXECUTED, CANCELLED, or EXPIRED', table: 'v3_order_details_equity', category: 'order', displayType: 'text' },
  { id: 'order_stock_code', name: 'Order Stock Code', description: 'Equity stock symbol', table: 'v3_order_details_equity', category: 'order', displayType: 'identifier' },
  { id: 'order_quantity', name: 'Order Quantity', description: 'Total shares placed', table: 'v3_order_details_equity', category: 'order', displayType: 'integer' },
  { id: 'order_trade_value', name: 'Order Trade Value', description: 'Gross value of order in INR', table: 'v3_order_details_equity', category: 'order', displayType: 'currency' },

  // Trade Information
  { id: 'trade_reference', name: 'Trade Reference', description: 'Execution Trade ID (e.g. TRD_000001)', table: 'v3_trade_details_equity', category: 'trade', displayType: 'identifier', isKey: true },
  { id: 'trade_date', name: 'Trade Date', description: 'Date trade was executed', table: 'v3_trade_details_equity', category: 'trade', displayType: 'date' },
  { id: 'trade_stock_code', name: 'Trade Stock Code', description: 'Traded stock ticker', table: 'v3_trade_details_equity', category: 'trade', displayType: 'identifier' },
  { id: 'trade_flow_buy_sell', name: 'Buy/Sell Flow', description: 'BUY or SELL action', table: 'v3_trade_details_equity', category: 'trade', displayType: 'text' },
  { id: 'trade_executed_quantity', name: 'Executed Quantity', description: 'Filled shares count', table: 'v3_trade_details_equity', category: 'trade', displayType: 'integer' },
  { id: 'trade_executed_rate', name: 'Executed Rate', description: 'Price per share in INR', table: 'v3_trade_details_equity', category: 'trade', displayType: 'currency' },
  { id: 'trade_value', name: 'Trade Value', description: 'Total executed amount in INR', table: 'v3_trade_details_equity', category: 'trade', displayType: 'currency' },
  { id: 'trade_order_reference', name: 'Trade Order Ref', description: 'Matching order reference ID', table: 'v3_trade_details_equity', category: 'trade', displayType: 'identifier', isKey: true },
];

export const V3_DEFAULT_FIELDS = [
  'client_code',
  'trade_reference',
  'trade_date',
  'trade_stock_code',
  'trade_flow_buy_sell',
  'trade_value',
];

/**
 * Returns explicit display type for any given column or field name.
 */
export function getFieldDisplayType(col: string): V3FieldDisplayType {
  const normalized = col.toLowerCase();

  // Explicit IDENTIFIER / TEXT columns that must NEVER receive currency formatting or commas
  if (
    normalized === 'client_code' ||
    normalized === 'form_number' ||
    normalized === 'user_mobile_number' ||
    normalized === 'user_telephone_number' ||
    normalized === 'user_office_number' ||
    normalized === 'user_id' ||
    normalized === 'client_user_id' ||
    normalized === 'client_web_user_id' ||
    normalized === 'client_pan_number' ||
    normalized === 'trade_reference' ||
    normalized === 'order_reference' ||
    normalized === 'trade_order_reference' ||
    normalized === 'order_ack_number' ||
    normalized === 'order_isin_number' ||
    normalized === 'trade_contract_number' ||
    normalized === 'trade_exchange_code' ||
    normalized === 'trade_stock_code' ||
    normalized === 'order_stock_code' ||
    normalized === 'order_exchange_code'
  ) {
    return 'identifier';
  }

  // Check in authoritative field catalog
  const found = V3_ALL_FIELDS.find((f) => f.id === normalized);
  if (found) return found.displayType;

  // Currency / financial fields
  if (
    normalized.includes('trade_value') ||
    normalized.includes('order_value') ||
    normalized.includes('brokerage') ||
    normalized.includes('amount') ||
    normalized.includes('rate') ||
    normalized.includes('charge') ||
    normalized.includes('margin')
  ) {
    return 'currency';
  }

  // Integer quantities / counts
  if (
    normalized.includes('count') ||
    normalized.includes('quantity') ||
    normalized === 'rowcount'
  ) {
    return 'integer';
  }

  // Dates
  if (normalized.includes('date')) {
    return 'date';
  }

  return 'text';
}

/**
 * Formats a value according to field metadata.
 * Ensures Form Number and Mobile Number are ALWAYS output as plain identifiers.
 */
export function formatV3FieldValue(col: string, val: any): string {
  if (val === null || val === undefined) {
    return '-';
  }

  const displayType = getFieldDisplayType(col);

  switch (displayType) {
    case 'identifier':
      // Preserve exact string representation, preserving leading zeros, no commas, no currency
      return String(val);

    case 'currency':
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    case 'integer':
      const intNum = Number(val);
      if (isNaN(intNum)) return String(val);
      return intNum.toLocaleString('en-IN');

    case 'date':
    case 'timestamp':
    case 'text':
    case 'boolean':
    default:
      return String(val);
  }
}
