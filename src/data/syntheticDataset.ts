// src/data/syntheticDataset.ts
// AIU Synthetic Dataset - 50 Records per source table
// Strictly preserves all 126 columns, BIGINT form_numbers, TEXT identifiers, DATE/TIMESTAMPTZ, and JSONB source-rows.
// Valid 1:1 relational linkage across all 5 tables (R1 - R5) with zero orphans.

export interface SyntheticDatasetStore {
  user_details: any[];
  user_account_information: any[];
  user_address_details: any[];
  user_personal_details: any[];
  client_details: any[];
}

const rawNames = [
  { first: 'Rahul', middle: 'Kumar', last: 'Sharma', gender: 'M' },
  { first: 'Priya', middle: 'Anand', last: 'Patel', gender: 'F' },
  { first: 'Amit', middle: 'Rajesh', last: 'Verma', gender: 'M' },
  { first: 'Sneha', middle: 'Vikram', last: 'Rao', gender: 'F' },
  { first: 'Vikram', middle: 'Suresh', last: 'Mehta', gender: 'M' },
  { first: 'Pooja', middle: 'Arvind', last: 'Joshi', gender: 'F' },
  { first: 'Rajesh', middle: 'Dilip', last: 'Iyer', gender: 'M' },
  { first: 'Ananya', middle: 'Manoj', last: 'Deshmukh', gender: 'F' },
  { first: 'Sanjay', middle: 'Ashok', last: 'Kulkarni', gender: 'M' },
  { first: 'Neha', middle: 'Sunil', last: 'Nair', gender: 'F' },
  { first: 'Aditya', middle: 'Kishore', last: 'Singh', gender: 'M' },
  { first: 'Kavita', middle: 'Ramesh', last: 'Gupta', gender: 'F' },
  { first: 'Rohan', middle: 'Mohan', last: 'Reddy', gender: 'M' },
  { first: 'Divya', middle: 'Naresh', last: 'Hegde', gender: 'F' },
  { first: 'Manish', middle: 'Prakash', last: 'Bhat', gender: 'M' },
  { first: 'Shweta', middle: 'Deepak', last: 'Menon', gender: 'F' },
  { first: 'Vivek', middle: 'Harish', last: 'Pillai', gender: 'M' },
  { first: 'Meera', middle: 'Gopal', last: 'Pillai', gender: 'F' },
  { first: 'Sandeep', middle: 'Jayant', last: 'Gokhale', gender: 'M' },
  { first: 'Ritu', middle: 'Bharat', last: 'Sen', gender: 'F' },
  { first: 'Gaurav', middle: 'Nitin', last: 'Aggarwal', gender: 'M' },
  { first: 'Tanvi', middle: 'Hemant', last: 'Kapoor', gender: 'F' },
  { first: 'Nitin', middle: 'Vijay', last: 'Bhatia', gender: 'M' },
  { first: 'Shilpa', middle: 'Narendra', last: 'Chawla', gender: 'F' },
  { first: 'Alok', middle: 'Devendra', last: 'Pandey', gender: 'M' },
  { first: 'Swati', middle: 'Chandrakant', last: 'Trivedi', gender: 'F' },
  { first: 'Manoj', middle: 'Jitendra', last: 'Shah', gender: 'M' },
  { first: 'Rashmi', middle: 'Arvind', last: 'Saxena', gender: 'F' },
  { first: 'Pradeep', middle: 'Vinod', last: 'Jain', gender: 'M' },
  { first: 'Preeti', middle: 'Anand', last: 'Bhattacharya', gender: 'F' },
  { first: 'Ashish', middle: 'Mahesh', last: 'Bhatt', gender: 'M' },
  { first: 'Jyoti', middle: 'Girish', last: 'Shirodkar', gender: 'F' },
  { first: 'Harish', middle: 'Omkar', last: 'Nambiar', gender: 'M' },
  { first: 'Pallavi', middle: 'Rakesh', last: 'Ghosh', gender: 'F' },
  { first: 'Deepak', middle: 'Satish', last: 'Varma', gender: 'M' },
  { first: 'Sonam', middle: 'Tarun', last: 'Das', gender: 'F' },
  { first: 'Kunal', middle: 'Umesh', last: 'Tiwari', gender: 'M' },
  { first: 'Aarti', middle: 'Vijay', last: 'Wadkar', gender: 'F' },
  { first: 'Sameer', middle: 'Yogesh', last: 'Rane', gender: 'M' },
  { first: 'Bhavna', middle: 'Balram', last: 'Dubey', gender: 'F' },
  { first: 'Tarun', middle: 'Chetan', last: 'Agarwal', gender: 'M' },
  { first: 'Sunita', middle: 'Dinkar', last: 'Salunkhe', gender: 'F' },
  { first: 'Nilesh', middle: 'Eknath', last: 'Shinde', gender: 'M' },
  { first: 'Archana', middle: 'Farhan', last: 'Khan', gender: 'F' },
  { first: 'Chetan', middle: 'Govind', last: 'Jadhav', gender: 'M' },
  { first: 'Vandana', middle: 'Himanshu', last: 'Soni', gender: 'F' },
  { first: 'Hemant', middle: 'Inderjeet', last: 'Gill', gender: 'M' },
  { first: 'Leena', middle: 'Jagdish', last: 'Thukral', gender: 'F' },
  { first: 'Nikhil', middle: 'Kamal', last: 'Malhotra', gender: 'M' },
  { first: 'Sangeeta', middle: 'Lalit', last: 'Chopra', gender: 'F' },
];

const cities = ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Bengaluru', 'Delhi', 'Ahmedabad', 'Hyderabad', 'Chennai', 'Kolkata'];
const states = ['Maharashtra', 'Maharashtra', 'Maharashtra', 'Maharashtra', 'Karnataka', 'Delhi', 'Gujarat', 'Telangana', 'Tamil Nadu', 'West Bengal'];

export function generateSyntheticDataset(): SyntheticDatasetStore {
  const user_details: any[] = [];
  const user_account_information: any[] = [];
  const user_address_details: any[] = [];
  const user_personal_details: any[] = [];
  const client_details: any[] = [];

  for (let i = 0; i < 50; i++) {
    const idx = i + 1;
    const clientCode = `CL00${idx < 10 ? '10' + idx : '1' + idx}`;
    const formNum = 1000000000 + idx; // BIGINT
    const mobile = `98201234${idx < 10 ? '0' + idx : idx}`;
    const pan = `ABCDE${1200 + idx}F`;
    const nameInfo = rawNames[i];
    const city = cities[i % cities.length];
    const state = states[i % states.length];
    const pin = `${400001 + (i * 12)}`;
    const email = `${nameInfo.first.toLowerCase()}.${nameInfo.last.toLowerCase()}${idx}@audit-example.com`;
    const dob = `19${75 + (i % 25)}-${((i % 12) + 1).toString().padStart(2, '0')}-${((i % 28) + 1).toString().padStart(2, '0')}`;
    const statusFlag = i % 15 === 0 ? 'SUSPENDED' : 'ACTIVE';
    const verifyStatus = i % 12 === 0 ? 'PENDING_AUDIT' : 'VERIFIED';

    // 1. user_details
    const udRow: any = {
      user_id: `USR_${clientCode}`,
      client_code: clientCode,
      user_account_status_flag: statusFlag,
      user_update_date: '2026-08-15',
      user_equity_allowed: 'Y',
      user_mf_allowed: i % 2 === 0 ? 'Y' : 'N',
      user_fno_allowed: i % 3 === 0 ? 'Y' : 'N',
      user_commodity_allowed: 'N',
      user_ipo_allowed: 'Y',
      user_loan_allowed: 'N',
      user_first_active_date: '2023-01-10',
    };
    udRow.data = { ...udRow };
    user_details.push(udRow);

    // 2. user_account_information
    const uaiRow: any = {
      form_number: formNum,
      client_code: clientCode,
      user_type_residential_nri: i === 4 ? 'NRI' : 'RESIDENT',
      user_bank_account_number: `5010049281${idx < 10 ? '0' + idx : idx}`,
      user_bank_customer_id: `CUST_${88000 + idx}`,
      user_bank_brnch_code: 'ICIC0000104',
      user_bank_account_type_self_joint: 'SELF',
      user_bank_account_open_date: '2022-11-04',
      user_demat_account_open_date: '2023-01-12',
      user_info_entered_by: 'EMP_4091',
      user_info_modified_by: 'EMP_4091',
      user_info_modified_date: '2026-07-20T10:15:30Z',
      user_bank_account_flag: 'VALID',
      user_bank_type: 'SAVINGS',
    };
    uaiRow.data = { ...uaiRow };
    user_account_information.push(uaiRow);

    // 3. user_address_details
    const uadRow: any = {
      form_number: formNum,
      address_type_correspondance_permanent: 'CORRESPONDENCE',
      address_1: `Flat ${101 + idx}, Harmony Towers`,
      address_2: `Sector ${5 + (idx % 20)}, Main Boulevard`,
      user_city: city,
      user_state: state,
      user_country: 'India',
      user_pin: String(pin),
      user_telephone_number: `022-2849${idx < 10 ? '0' + idx : idx}`,
      user_office_number: `022-6789${idx < 10 ? '0' + idx : idx}`,
      user_mobile_number: mobile,
      user_mail_address_flag: 'Y',
      user_details_entered_by: 'EMP_4091',
      user_details_entry_date: '2023-01-10T09:30:00Z',
      user_details_modified_by: 'EMP_8842',
      user_details_modified_date: '2026-06-18T14:20:00Z',
      user_address_same_as_correspondance: 'Y',
      user_ip: `192.168.10.${idx}`,
      user_mobile_relation: 'SELF',
      user_rm_preferred_location_pin: String(pin),
    };
    uadRow.data = { ...uadRow };
    user_address_details.push(uadRow);

    // 4. user_personal_details
    const updRow: any = {
      form_number: formNum,
      user_type_applicant_permanent: 'PRIMARY',
      user_first_name: nameInfo.first,
      user_middle_name: nameInfo.middle,
      user_last_name: nameInfo.last,
      user_dob: dob,
      user_sex: nameInfo.gender,
      user_minor_flag: 'N',
      user_email: email,
      user_country_birth: 'India',
      user_nationality: 'Indian',
      user_entered_employee_number: 'EMP_4091',
      user_details_entered_date: '2023-01-10T09:30:00Z',
      user_details_modified_employee_number: 'EMP_8842',
      userd_details_modified_date: '2026-06-18T14:20:00Z',
      user_designation: 'Salaried Professional',
      user_relation: 'SELF',
      user_user_id: `USR_${clientCode}`,
      user_income_category: '5_TO_10_LAKHS',
      user_marital_status: 'MARRIED',
      user_political_connect: 'N',
      user_inperson_verification_date: '2023-01-11',
      user_customer_type: 'INDIVIDUAL',
      user_update_ip: `192.168.10.${idx}`,
      user_update_channel: 'WEB',
      user_us_person: 'N',
      user_tax_filing_country: 'India',
      user_place_of_birth: city,
      user_email_relation: 'SELF',
      user_aadhar_last_4_digit: `${4000 + idx}`,
      user_name_as_per_aadhar: `${nameInfo.first} ${nameInfo.middle} ${nameInfo.last}`,
      user_aadhar_status: 'VERIFIED',
      user_aadhar_consent_flag: 'Y',
    };
    updRow.data = { ...updRow };
    user_personal_details.push(updRow);

    // 5. client_details
    const cdRow: any = {
      form_number: formNum,
      client_code: clientCode,
      customer_type_individual_huf: 'INDIVIDUAL',
      client_inward_date: '2023-01-10',
      client_scheme_type: 'DEFAULT_STANDARD',
      client_inward_status: 'ACCEPTED',
      client_inward_accept_date: '2023-01-11',
      client_agreement_date: '2023-01-10',
      client_agent_code: 'AGT_9921',
      client_sub_agent_code: 'SUB_102',
      client_product_type: 'EQUITY_CASH',
      client_icici_emp_number: 'EMP_4091',
      client_receipt_date: '2023-01-10',
      client_form_version: 'V2.4',
      client_user_id: `USR_${clientCode}`,
      client_web_user_id: `WEB_${clientCode}`,
      client_marital_status: 'MARRIED',
      client_education_code: 'GRADUATE',
      client_income_category_code: 'INC_CAT_3',
      client_holding_range_code: 'HLD_10L_25L',
      client_customer_nri_flag: i === 4 ? 'Y' : 'N',
      client_form_60_flag: 'N',
      client_tax_assesse_flag: 'Y',
      client_verification_date: '2023-01-12',
      client_verify_status: verifyStatus,
      client_ack_flag: 'Y',
      client_ack_date: '2023-01-12',
      client_send_mail_flag: 'Y',
      client_eba_upload_flag: 'Y',
      client_eba_upload_date: '2023-01-13',
      client_last_flag: 'Y',
      client_rejection_mail_remarks: '',
      client_details_entered_by: 'EMP_4091',
      client_details_entry_date: '2023-01-10T09:30:00Z',
      client_details_modified_by: 'EMP_8842',
      client_details_modified_date: '2026-06-18T14:20:00Z',
      client_pan_number: pan,
      client_category_employee_code: 'CAT_NORMAL',
      client_rm_code: 'RM_7719',
      client_nri_category_type: i === 4 ? 'NRE' : 'NONE',
      client_nri_base_scheme: 'SCH_STD',
      client_nri_current_scheme: 'SCH_STD',
      client_non_isec_agent_code: '',
      client_customer_type_change_date: '2023-01-10',
      client_bank_type: 'PRIVATE',
      client_settlement_type: 'MONTHLY',
      client_demat_mandate_category: 'ONLINE',
      client_brokerage_model_flag: 'PREPAID_GOLD',
    };
    cdRow.data = { ...cdRow };
    client_details.push(cdRow);
  }

  // Multi-match test case: CL00101 has a secondary form (1000000051) with same mobile (9820123401)
  const multiFormNum = 1000000051;
  const multiClientCode = 'CL00101';
  const multiMobile = '9820123401';
  const multiPan = 'ABCDE1201F';

  const uaiSecondary: any = {
    form_number: multiFormNum,
    client_code: multiClientCode,
    user_type_residential_nri: 'RESIDENT',
    user_bank_account_number: '501004928199',
    user_bank_customer_id: 'CUST_88099',
    user_bank_brnch_code: 'ICIC0000104',
    user_bank_account_type_self_joint: 'JOINT',
    user_bank_account_open_date: '2023-05-10',
    user_demat_account_open_date: '2023-06-01',
    user_info_entered_by: 'EMP_4091',
    user_info_modified_by: 'EMP_4091',
    user_info_modified_date: '2026-07-20T10:15:30Z',
    user_bank_account_flag: 'VALID',
    user_bank_type: 'CURRENT',
  };
  uaiSecondary.data = { ...uaiSecondary };
  user_account_information.push(uaiSecondary);

  const uadSecondary: any = {
    form_number: multiFormNum,
    address_type_correspondance_permanent: 'CORRESPONDENCE',
    address_1: 'Plot 42, Cyber Gateway',
    address_2: 'Tech Park Zone',
    user_city: 'Pune',
    user_state: 'Maharashtra',
    user_country: 'India',
    user_pin: '411057',
    user_telephone_number: '020-25890101',
    user_office_number: '020-66778899',
    user_mobile_number: multiMobile,
    user_mail_address_flag: 'Y',
    user_details_entered_by: 'EMP_4091',
    user_details_entry_date: '2023-05-10T09:30:00Z',
    user_details_modified_by: 'EMP_8842',
    user_details_modified_date: '2026-06-18T14:20:00Z',
    user_address_same_as_correspondance: 'Y',
    user_ip: '192.168.10.99',
    user_mobile_relation: 'SELF',
    user_rm_preferred_location_pin: '411057',
  };
  uadSecondary.data = { ...uadSecondary };
  user_address_details.push(uadSecondary);

  const updSecondary: any = {
    form_number: multiFormNum,
    user_type_applicant_permanent: 'PRIMARY',
    user_first_name: 'Rahul',
    user_middle_name: 'Kumar',
    user_last_name: 'Sharma',
    user_dob: '1985-04-12',
    user_sex: 'M',
    user_minor_flag: 'N',
    user_email: 'rahul.sharma1@audit-example.com',
    user_country_birth: 'India',
    user_nationality: 'Indian',
    user_entered_employee_number: 'EMP_4091',
    user_details_entered_date: '2023-05-10T09:30:00Z',
    user_details_modified_employee_number: 'EMP_8842',
    userd_details_modified_date: '2026-06-18T14:20:00Z',
    user_designation: 'Salaried Professional',
    user_relation: 'SELF',
    user_user_id: `USR_${multiClientCode}`,
    user_income_category: '10_TO_25_LAKHS',
    user_marital_status: 'MARRIED',
    user_political_connect: 'N',
    user_inperson_verification_date: '2023-05-11',
    user_customer_type: 'INDIVIDUAL',
    user_update_ip: '192.168.10.99',
    user_update_channel: 'WEB',
    user_us_person: 'N',
    user_tax_filing_country: 'India',
    user_place_of_birth: 'Mumbai',
    user_email_relation: 'SELF',
    user_aadhar_last_4_digit: '4001',
    user_name_as_per_aadhar: 'Rahul Kumar Sharma',
    user_aadhar_status: 'VERIFIED',
    user_aadhar_consent_flag: 'Y',
  };
  updSecondary.data = { ...updSecondary };
  user_personal_details.push(updSecondary);

  const cdSecondary: any = {
    form_number: multiFormNum,
    client_code: multiClientCode,
    customer_type_individual_huf: 'INDIVIDUAL',
    client_inward_date: '2023-05-10',
    client_scheme_type: 'PREMIUM_GOLD',
    client_inward_status: 'ACCEPTED',
    client_inward_accept_date: '2023-05-11',
    client_agreement_date: '2023-05-10',
    client_agent_code: 'AGT_9921',
    client_sub_agent_code: 'SUB_102',
    client_product_type: 'DERIVATIVES_FNO',
    client_icici_emp_number: 'EMP_4091',
    client_receipt_date: '2023-05-10',
    client_form_version: 'V2.4',
    client_user_id: `USR_${multiClientCode}`,
    client_web_user_id: `WEB_${multiClientCode}`,
    client_marital_status: 'MARRIED',
    client_education_code: 'GRADUATE',
    client_income_category_code: 'INC_CAT_3',
    client_holding_range_code: 'HLD_10L_25L',
    client_customer_nri_flag: 'N',
    client_form_60_flag: 'N',
    client_tax_assesse_flag: 'Y',
    client_verification_date: '2023-05-12',
    client_verify_status: 'VERIFIED',
    client_ack_flag: 'Y',
    client_ack_date: '2023-05-12',
    client_send_mail_flag: 'Y',
    client_eba_upload_flag: 'Y',
    client_eba_upload_date: '2023-05-13',
    client_last_flag: 'Y',
    client_rejection_mail_remarks: '',
    client_details_entered_by: 'EMP_4091',
    client_details_entry_date: '2023-05-10T09:30:00Z',
    client_details_modified_by: 'EMP_8842',
    client_details_modified_date: '2026-06-18T14:20:00Z',
    client_pan_number: multiPan,
    client_category_employee_code: 'CAT_NORMAL',
    client_rm_code: 'RM_7719',
    client_nri_category_type: 'NONE',
    client_nri_base_scheme: 'SCH_STD',
    client_nri_current_scheme: 'SCH_STD',
    client_non_isec_agent_code: '',
    client_customer_type_change_date: '2023-05-10',
    client_bank_type: 'PRIVATE',
    client_settlement_type: 'MONTHLY',
    client_demat_mandate_category: 'ONLINE',
    client_brokerage_model_flag: 'PREPAID_PLATINUM',
  };
  cdSecondary.data = { ...cdSecondary };
  client_details.push(cdSecondary);

  return {
    user_details,
    user_account_information,
    user_address_details,
    user_personal_details,
    client_details,
  };
}

export const SYNTHETIC_DATASET: SyntheticDatasetStore = generateSyntheticDataset();
