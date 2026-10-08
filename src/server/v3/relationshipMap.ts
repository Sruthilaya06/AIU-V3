// src/server/v3/relationshipMap.ts
// Predefined, validated relational joins for AIU V3 tables
// Rejects unapproved or arbitrary table/column join pairs

export interface ValidatedRelationship {
  id: string;
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  description: string;
}

export const APPROVED_RELATIONSHIPS: ValidatedRelationship[] = [
  // Client ↔ Orders
  {
    id: 'client_to_orders',
    sourceTable: 'v3_client_details',
    sourceField: 'client_code',
    targetTable: 'v3_order_details_equity',
    targetField: 'client_code',
    description: 'Client Details to Order Details on client_code',
  },
  {
    id: 'orders_to_client',
    sourceTable: 'v3_order_details_equity',
    sourceField: 'client_code',
    targetTable: 'v3_client_details',
    targetField: 'client_code',
    description: 'Order Details to Client Details on client_code',
  },

  // Client ↔ Trades
  {
    id: 'client_to_trades',
    sourceTable: 'v3_client_details',
    sourceField: 'client_code',
    targetTable: 'v3_trade_details_equity',
    targetField: 'client_code',
    description: 'Client Details to Trade Details on client_code',
  },
  {
    id: 'trades_to_client',
    sourceTable: 'v3_trade_details_equity',
    sourceField: 'client_code',
    targetTable: 'v3_client_details',
    targetField: 'client_code',
    description: 'Trade Details to Client Details on client_code',
  },

  // Orders ↔ Trades
  {
    id: 'orders_to_trades',
    sourceTable: 'v3_order_details_equity',
    sourceField: 'order_reference',
    targetTable: 'v3_trade_details_equity',
    targetField: 'trade_order_reference',
    description: 'Order Details to Trade Details on order_reference = trade_order_reference',
  },
  {
    id: 'trades_to_orders',
    sourceTable: 'v3_trade_details_equity',
    sourceField: 'trade_order_reference',
    targetTable: 'v3_order_details_equity',
    targetField: 'order_reference',
    description: 'Trade Details to Order Details on trade_order_reference = order_reference',
  },

  // Client ↔ User Details
  {
    id: 'client_to_user',
    sourceTable: 'v3_client_details',
    sourceField: 'client_code',
    targetTable: 'v3_user_details',
    targetField: 'client_code',
    description: 'Client Details to User Details on client_code',
  },
  {
    id: 'user_to_client',
    sourceTable: 'v3_user_details',
    sourceField: 'client_code',
    targetTable: 'v3_client_details',
    targetField: 'client_code',
    description: 'User Details to Client Details on client_code',
  },

  // Client ↔ Account Info
  {
    id: 'client_to_account',
    sourceTable: 'v3_client_details',
    sourceField: 'form_number',
    targetTable: 'v3_user_account_information',
    targetField: 'form_number',
    description: 'Client Details to User Account Information on form_number',
  },
  {
    id: 'account_to_client',
    sourceTable: 'v3_user_account_information',
    sourceField: 'form_number',
    targetTable: 'v3_client_details',
    targetField: 'form_number',
    description: 'User Account Information to Client Details on form_number',
  },

  // Client ↔ Address Details
  {
    id: 'client_to_address',
    sourceTable: 'v3_client_details',
    sourceField: 'form_number',
    targetTable: 'v3_user_address_details',
    targetField: 'form_number',
    description: 'Client Details to User Address Details on form_number',
  },
  {
    id: 'address_to_client',
    sourceTable: 'v3_user_address_details',
    sourceField: 'form_number',
    targetTable: 'v3_client_details',
    targetField: 'form_number',
    description: 'User Address Details to Client Details on form_number',
  },

  // Client ↔ Personal Details
  {
    id: 'client_to_personal',
    sourceTable: 'v3_client_details',
    sourceField: 'form_number',
    targetTable: 'v3_user_personal_details',
    targetField: 'form_number',
    description: 'Client Details to User Personal Details on form_number',
  },
  {
    id: 'personal_to_client',
    sourceTable: 'v3_user_personal_details',
    sourceField: 'form_number',
    targetTable: 'v3_client_details',
    targetField: 'form_number',
    description: 'User Personal Details to Client Details on form_number',
  },

  // User Details ↔ Personal Details
  {
    id: 'user_to_personal',
    sourceTable: 'v3_user_details',
    sourceField: 'user_id',
    targetTable: 'v3_user_personal_details',
    targetField: 'user_user_id',
    description: 'User Details to User Personal Details on user_id = user_user_id',
  },
  {
    id: 'personal_to_user',
    sourceTable: 'v3_user_personal_details',
    sourceField: 'user_user_id',
    targetTable: 'v3_user_details',
    targetField: 'user_id',
    description: 'User Personal Details to User Details on user_user_id = user_id',
  },

  // User Details ↔ Account Info
  {
    id: 'user_to_account',
    sourceTable: 'v3_user_details',
    sourceField: 'client_code',
    targetTable: 'v3_user_account_information',
    targetField: 'client_code',
    description: 'User Details to User Account Information on client_code',
  },
  {
    id: 'account_to_user',
    sourceTable: 'v3_user_account_information',
    sourceField: 'client_code',
    targetTable: 'v3_user_details',
    targetField: 'client_code',
    description: 'User Account Information to User Details on client_code',
  },
];

/**
 * Finds an approved join relationship between two tables.
 */
export function findApprovedRelationship(
  table1: string,
  table2: string,
  relationshipId?: string
): ValidatedRelationship | null {
  if (relationshipId) {
    const found = APPROVED_RELATIONSHIPS.find((r) => r.id === relationshipId);
    if (found && ((found.sourceTable === table1 && found.targetTable === table2) ||
                  (found.sourceTable === table2 && found.targetTable === table1))) {
      return found;
    }
  }

  const match = APPROVED_RELATIONSHIPS.find(
    (r) =>
      (r.sourceTable === table1 && r.targetTable === table2) ||
      (r.sourceTable === table2 && r.targetTable === table1)
  );
  return match || null;
}
