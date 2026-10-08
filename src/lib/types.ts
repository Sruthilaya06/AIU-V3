// src/lib/types.ts
// Standardized types for AIU Data Retrieval Application V2.1 (Stabilization Pass)

export type TableName =
  | 'user_details'
  | 'user_account_information'
  | 'user_address_details'
  | 'user_personal_details'
  | 'client_details';

export type SearchType = 'mobile' | 'client_code' | 'form_number';

export type SearchMode = 'single' | 'bulk';

export type OutputFieldCategory =
  | 'Client Information'
  | 'Personal Information'
  | 'Contact Information'
  | 'Account Information';

export interface OutputFieldDefinition {
  id: string;
  label: string; // Business-friendly name (e.g. "Mobile Number", "PAN", "First Name")
  table: TableName;
  column: string;
  category: OutputFieldCategory;
  defaultSelected?: boolean;
  description?: string;
}

export type ResultStatus = 'MATCHED' | 'NO MATCH' | 'INVALID INPUT' | 'DUPLICATE INPUT' | 'ERROR';

export interface SingleSearchResult {
  searchMode: 'single';
  searchType: SearchType;
  searchValue: string;
  status: ResultStatus;
  selectedFields: string[];
  matchCount: number;
  records: Record<string, any>[]; // All matching records containing requested fields
  data: Record<string, any> | null; // Primary/first matching record (for convenience)
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface BulkRowResult {
  rowNumber: number;
  inputIdentifier: string;
  normalizedIdentifier: string;
  status: ResultStatus;
  matchCount: number;
  data: Record<string, any>; // Primary record values (friendly field label -> value)
  allRecords?: Record<string, any>[]; // Multiple matches if present
  originalRowData?: Record<string, any>; // Full original input row for 100% traceability
  errorMessage?: string;
}

export interface BulkSearchJob {
  id: string;
  fileName: string;
  fileType: string;
  selectedSheet?: string;
  delimiter?: string;
  totalRows: number;
  uniqueIdentifiers: number;
  searchType: SearchType;
  inputColumn: string;
  selectedFields: string[];
  matchedCount: number;
  noMatchCount: number;
  invalidCount: number;
  duplicateCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  progress: number;
  results: BulkRowResult[];
  originalColumns: string[];
  executionTimeMs?: number;
  errorMessage?: string;
}

export interface RetrievalHistoryRecord {
  id: string;
  timestamp: string;
  mode: SearchMode;
  searchType: SearchType;
  inputSummary: string; // "9820123401" or "audit_clients.xlsx (120 rows)"
  inputCount: number;
  matchedCount: number;
  noMatchCount: number;
  status: string;
  selectedFieldCount: number;
  selectedFieldLabels: string[];
}

export interface ColumnDefinition {
  name: string;
  dataType: 'TEXT' | 'BIGINT' | 'DATE' | 'TIMESTAMPTZ' | 'JSONB';
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  fkTarget?: {
    table: TableName;
    column: string;
  };
  description?: string;
  defaultVisible?: boolean;
}

export interface TableMetadata {
  id: TableName;
  displayName: string;
  description: string;
  primaryKey: string[];
  columns: ColumnDefinition[];
  displayColumns: string[];
}

export interface RelationshipMetadata {
  id: string;
  code: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  parentTable: TableName;
  parentKey: string;
  childTable: TableName;
  childKey: string;
  description: string;
  cardinality: '1:1' | '1:N';
}

export interface ValidationSummary {
  isLiveMode: boolean;
  dataSourceLabel: string;
  totalTables: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  orphanRecords: number;
  relationshipsChecked: number;
  tableStats: {
    table: TableName;
    displayName: string;
    count: number;
    pkValid: boolean;
    fkValid: boolean;
    orphans: number;
  }[];
  relationshipChecks: {
    id: string;
    code: string;
    name: string;
    status: 'VALID' | 'FAIL';
    sourceCount: number;
    linkedCount: number;
    orphans: number;
    message: string;
  }[];
}
