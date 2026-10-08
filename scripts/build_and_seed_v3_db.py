#!/usr/bin/env python3
"""
scripts/build_and_seed_v3_db.py
Authoritative AIU V3 Database Creation, Seeding & Validation Engine
Creates isolated SQLite database at data/v3_aiu.db
Enforces all 7 tables, PKs, FKs, indexes, seeds 100/100/100/100/100/5305/5000 records,
validates integrity, and executes SQL validation tests A through K.
"""

import os
import sys
import sqlite3
import random
from datetime import datetime, date, timedelta

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DB_DIR, "v3_aiu.db")

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def create_schema(conn):
    cur = conn.cursor()

    # Table 1: v3_user_details
    cur.execute("""
    CREATE TABLE v3_user_details (
        user_id TEXT PRIMARY KEY,
        client_code TEXT UNIQUE NOT NULL,
        user_account_status_flag TEXT NOT NULL,
        user_update_date TEXT NOT NULL,
        user_equity_allowed TEXT NOT NULL DEFAULT 'Y',
        user_mf_allowed TEXT NOT NULL DEFAULT 'Y',
        user_fno_allowed TEXT NOT NULL DEFAULT 'Y',
        user_commodity_allowed TEXT NOT NULL DEFAULT 'N',
        user_ipo_allowed TEXT NOT NULL DEFAULT 'Y',
        user_loan_allowed TEXT NOT NULL DEFAULT 'N',
        user_first_active_date TEXT NOT NULL
    );
    """)

    # Table 5: v3_client_details (Formed before child tables needing form_number)
    cur.execute("""
    CREATE TABLE v3_client_details (
        client_code TEXT PRIMARY KEY,
        form_number INTEGER UNIQUE NOT NULL,
        customer_type_individual_huf TEXT NOT NULL,
        client_inward_date TEXT NOT NULL,
        client_scheme_type TEXT NOT NULL,
        client_inward_status TEXT NOT NULL,
        client_inward_accept_date TEXT NOT NULL,
        client_agreement_date TEXT NOT NULL,
        client_agent_code TEXT NOT NULL,
        client_sub_agent_code REAL,
        client_product_type TEXT NOT NULL,
        client_icici_emp_number TEXT NOT NULL,
        client_receipt_date TEXT NOT NULL,
        client_form_version TEXT NOT NULL,
        client_user_id TEXT NOT NULL REFERENCES v3_user_details(user_id),
        client_web_user_id TEXT NOT NULL,
        client_marital_status TEXT NOT NULL,
        client_education_code TEXT NOT NULL,
        client_income_category_code TEXT NOT NULL,
        client_holding_range_code TEXT NOT NULL,
        client_customer_nri_flag TEXT NOT NULL,
        client_form_60_flag TEXT NOT NULL,
        client_tax_assesse_flag TEXT NOT NULL,
        client_verification_date TEXT NOT NULL,
        client_verify_status TEXT NOT NULL,
        client_ack_flag TEXT NOT NULL,
        client_ack_date TEXT NOT NULL,
        client_send_mail_flag TEXT NOT NULL,
        client_eba_upload_flag TEXT NOT NULL,
        client_eba_upload_date TEXT NOT NULL,
        client_last_flag TEXT NOT NULL,
        client_rejection_mail_remarks REAL,
        client_details_entered_by REAL,
        client_details_entry_date TEXT NOT NULL,
        client_details_modified_by TEXT NOT NULL,
        client_details_modified_date TEXT NOT NULL,
        client_pan_number TEXT NOT NULL,
        client_category_employee_code TEXT NOT NULL,
        client_rm_code TEXT NOT NULL,
        client_nri_category_type TEXT,
        client_nri_base_scheme TEXT,
        client_nri_current_scheme TEXT,
        client_non_isec_agent_code TEXT,
        client_customer_type_change_date TEXT NOT NULL,
        client_bank_type TEXT NOT NULL,
        client_settlement_type TEXT NOT NULL,
        client_demat_mandate_category TEXT,
        client_brokerage_model_flag TEXT NOT NULL,
        FOREIGN KEY (client_code) REFERENCES v3_user_details(client_code)
    );
    """)

    # Table 2: v3_user_account_information
    cur.execute("""
    CREATE TABLE v3_user_account_information (
        form_number INTEGER PRIMARY KEY,
        user_type_residential_nri TEXT NOT NULL,
        user_bank_account_number INTEGER NOT NULL,
        user_bank_customer_id TEXT NOT NULL,
        user_bank_brnch_code TEXT NOT NULL,
        user_bank_account_type_self_joint TEXT NOT NULL,
        user_bank_account_open_date TEXT NOT NULL,
        client_code TEXT NOT NULL REFERENCES v3_user_details(client_code),
        user_demat_account_open_date TEXT NOT NULL,
        user_info_entered_by TEXT NOT NULL,
        user_info_modified_by TEXT NOT NULL,
        user_info_modified_date TEXT NOT NULL,
        user_bank_account_flag TEXT NOT NULL,
        user_bank_type TEXT NOT NULL,
        FOREIGN KEY (form_number) REFERENCES v3_client_details(form_number)
    );
    """)

    # Table 3: v3_user_address_details
    cur.execute("""
    CREATE TABLE v3_user_address_details (
        form_number INTEGER PRIMARY KEY,
        address_type_correspondance_permanent TEXT NOT NULL,
        address_1 TEXT NOT NULL,
        address_2 TEXT NOT NULL,
        user_city TEXT NOT NULL,
        user_state TEXT NOT NULL,
        user_country TEXT NOT NULL,
        user_pin INTEGER NOT NULL,
        user_telephone_number INTEGER NOT NULL,
        user_office_number INTEGER NOT NULL,
        user_mobile_number INTEGER NOT NULL,
        user_mail_address_flag TEXT NOT NULL,
        user_details_entered_by TEXT NOT NULL,
        user_details_entry_date TEXT NOT NULL,
        user_details_modified_by TEXT NOT NULL,
        user_details_modified_date TEXT NOT NULL,
        user_address_same_as_correspondance TEXT NOT NULL,
        user_ip TEXT NOT NULL,
        user_mobile_relation TEXT NOT NULL,
        user_rm_preferred_location_pin INTEGER NOT NULL,
        FOREIGN KEY (form_number) REFERENCES v3_client_details(form_number)
    );
    """)

    # Table 4: v3_user_personal_details
    cur.execute("""
    CREATE TABLE v3_user_personal_details (
        form_number INTEGER PRIMARY KEY,
        user_type_applicant_permanent TEXT NOT NULL,
        user_first_name TEXT NOT NULL,
        user_middle_name TEXT,
        user_last_name TEXT NOT NULL,
        user_dob TEXT NOT NULL,
        user_sex TEXT NOT NULL,
        user_minor_flag TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_country_birth TEXT NOT NULL,
        user_nationality TEXT NOT NULL,
        user_entered_employee_number TEXT NOT NULL,
        user_details_entered_date TEXT NOT NULL,
        user_details_modified_employee_number TEXT NOT NULL,
        userd_details_modified_date TEXT NOT NULL,
        user_designation TEXT NOT NULL,
        user_relation TEXT NOT NULL,
        user_user_id TEXT NOT NULL REFERENCES v3_user_details(user_id),
        user_income_category TEXT NOT NULL,
        user_marital_status TEXT NOT NULL,
        user_political_connect TEXT NOT NULL,
        user_inperson_verification_date TEXT NOT NULL,
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
        user_aadhar_consent_flag TEXT NOT NULL,
        FOREIGN KEY (form_number) REFERENCES v3_client_details(form_number)
    );
    """)

    # Table 6: v3_order_details_equity
    cur.execute("""
    CREATE TABLE v3_order_details_equity (
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
        order_lmt_rate REAL NOT NULL,
        order_disclosed_quantity INTEGER NOT NULL,
        order_status TEXT NOT NULL,
        order_trade_date TEXT NOT NULL,
        order_ack_number TEXT NOT NULL,
        order_executed_quantity INTEGER NOT NULL,
        order_amount_blocked REAL NOT NULL,
        order_brokerage_value REAL NOT NULL,
        order_isin_number TEXT NOT NULL,
        order_placed_status TEXT NOT NULL,
        order_quantity_blocked INTEGER NOT NULL,
        order_margin_percentage REAL NOT NULL,
        order_exchange_user_id INTEGER NOT NULL,
        order_btst_settlement_number INTEGER NOT NULL,
        order_btst_segment_code TEXT NOT NULL,
        order_channel TEXT NOT NULL,
        order_margin_square_off_mode TEXT NOT NULL,
        order_cancel_quantity INTEGER NOT NULL,
        order_type TEXT NOT NULL,
        order_valid_date TEXT NOT NULL,
        order_cal_flag TEXT NOT NULL,
        order_exchange_ack TEXT NOT NULL,
        order_trade_value REAL NOT NULL,
        order_date TEXT NOT NULL
    );
    """)

    # Table 7: v3_trade_details_equity
    cur.execute("""
    CREATE TABLE v3_trade_details_equity (
        trade_reference TEXT PRIMARY KEY,
        client_code TEXT NOT NULL REFERENCES v3_client_details(client_code),
        trade_exchange_code TEXT NOT NULL,
        trade_stock_code TEXT NOT NULL,
        trade_exchange_segment_code TEXT NOT NULL,
        trade_exchange_segment_settlement INTEGER NOT NULL,
        trade_order_reference TEXT NOT NULL REFERENCES v3_order_details_equity(order_reference),
        trade_date TEXT NOT NULL,
        trade_transaction_type TEXT NOT NULL,
        trade_flow_buy_sell TEXT NOT NULL,
        trade_executed_quantity INTEGER NOT NULL,
        trade_executed_rate REAL NOT NULL,
        trade_value REAL NOT NULL,
        trade_brokerage_value REAL NOT NULL,
        trade_net_value REAL NOT NULL,
        trade_amount_blocked REAL NOT NULL,
        trade_exchange_reference INTEGER NOT NULL,
        trade_upload_match_flag TEXT NOT NULL,
        trade_contract_number TEXT NOT NULL,
        trade_brokerage_flag TEXT NOT NULL,
        trade_sebi_charge_value REAL NOT NULL,
        trade_user_id TEXT NOT NULL,
        trade_transaction_charge REAL NOT NULL
    );
    """)

    # Create Indexes
    indexes = [
        "CREATE INDEX idx_v3_uai_client_code ON v3_user_account_information (client_code);",
        "CREATE INDEX idx_v3_upd_user_id ON v3_user_personal_details (user_user_id);",
        "CREATE INDEX idx_v3_cd_user_id ON v3_client_details (client_user_id);",
        "CREATE INDEX idx_v3_cd_form_number ON v3_client_details (form_number);",
        "CREATE INDEX idx_v3_orders_client_code ON v3_order_details_equity (client_code);",
        "CREATE INDEX idx_v3_orders_order_date ON v3_order_details_equity (order_date);",
        "CREATE INDEX idx_v3_orders_trade_date ON v3_order_details_equity (order_trade_date);",
        "CREATE INDEX idx_v3_trades_client_code ON v3_trade_details_equity (client_code);",
        "CREATE INDEX idx_v3_trades_order_ref ON v3_trade_details_equity (trade_order_reference);",
        "CREATE INDEX idx_v3_trades_trade_date ON v3_trade_details_equity (trade_date);",
        "CREATE INDEX idx_v3_trades_client_date ON v3_trade_details_equity (client_code, trade_date DESC);",
    ]
    for idx_sql in indexes:
        cur.execute(idx_sql)

    conn.commit()
    print("[SUCCESS] V3 schema & indexes created.")

def seed_data(conn):
    cur = conn.cursor()
    rng = random.Random(42) # Deterministic seed

    first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
        "Shaurya", "Atharv", "Dhruv", "Kabir", "Rohan", "Ananya", "Diya", "Isha", "Aditi", "Pari"
    ]
    middle_names = ["Kumar", "Anand", "Rajesh"] # Exactly 3 distinct values per spec
    last_names = [
        "Sharma", "Patel", "Verma", "Rao", "Mehta", "Joshi", "Iyer", "Deshmukh", "Kulkarni", "Nair",
        "Singh", "Gupta", "Reddy", "Hegde", "Bhat", "Menon", "Pillai", "Gokhale", "Sen", "Aggarwal"
    ]
    cities = [
        ("Mumbai", "Maharashtra", 400001),
        ("Pune", "Maharashtra", 411001),
        ("Bengaluru", "Karnataka", 560001),
        ("Hyderabad", "Telangana", 500001),
        ("Chennai", "Tamil Nadu", 600001),
        ("Delhi", "Delhi", 110001),
        ("Ahmedabad", "Gujarat", 380001),
        ("Kolkata", "West Bengal", 700001),
        ("Jaipur", "Rajasthan", 302001),
        ("Chandigarh", "Punjab", 160001),
    ]

    stocks = [
        ("RELIANCE", "INE002A01018", 2950.0),
        ("TCS", "INE467B01029", 3840.0),
        ("INFY", "INE009A01021", 1620.0),
        ("HDFCBANK", "INE040A01034", 1530.0),
        ("ICICIBANK", "INE090A01021", 1120.0),
        ("SBIN", "INE062A01020", 810.0),
        ("BHARTIARTL", "INE397D01024", 1290.0),
        ("ITC", "INE154A01025", 430.0),
        ("KOTAKBANK", "INE237A01028", 1780.0),
        ("LT", "INE018A01030", 3560.0),
        ("AXISBANK", "INE238A01034", 1190.0),
        ("HINDUNILVR", "INE030A01027", 2420.0)
    ]

    # 1. Generate 100 Users & Clients
    user_rows = []
    client_rows = []
    account_rows = []
    address_rows = []
    personal_rows = []

    for i in range(1, 101):
        client_code = f"CL{100 + i:05d}"
        user_id = f"USR_{client_code}"
        form_number = 1000000000 + i

        # Specific client characteristics for test scenarios:
        # Client 5 (CL00105): Inactive client who traded in July 2026 (Scenario 7)
        if i == 5:
            status_flag = "INACTIVE"
        elif i % 10 == 0:
            status_flag = "INACTIVE"
        else:
            status_flag = "ACTIVE"

        update_date = f"2026-0{(i % 6) + 1:02d}-{(i % 25) + 1:02d} 10:30:00"
        first_active_date = f"2023-0{(i % 9) + 1:02d}-{(i % 25) + 1:02d}"

        user_rows.append((
            user_id, client_code, status_flag, update_date,
            "Y", "Y" if i % 2 == 0 else "N", "Y" if i % 3 != 0 else "N",
            "Y" if i % 5 == 0 else "N", "Y", "N", first_active_date
        ))

        # Personal details
        fn = first_names[(i - 1) % len(first_names)]
        ln = last_names[(i - 1) % len(last_names)]
        # Exactly 23 nulls in middle name per spec: indices 1 to 23
        if i <= 23:
            mn = None
        else:
            mn = middle_names[(i - 1) % len(middle_names)]

        sex = "M" if (i % 2 == 1) else "F"
        dob = f"{1975 + (i % 25)}-0{(i % 9) + 1:02d}-{(i % 25) + 1:02d}"
        email = f"{fn.lower()}.{ln.lower()}{i}@example-aiu.com"
        pan = f"ABCDE{1000 + i}F"
        city_info = cities[(i - 1) % len(cities)]

        # Client details
        is_nri = "Y" if i in (4, 14, 24, 34, 44) else "N"
        nri_cat = "NRE" if is_nri == "Y" else (None if i <= 31 else "NONE")
        nri_base = "SCH_STD" if is_nri == "Y" else (None if i <= 34 else "SCH_BASIC")
        nri_curr = "SCH_STD" if is_nri == "Y" else (None if i <= 34 else "SCH_BASIC")
        demat_mand = "ONLINE" if i % 2 == 0 else (None if i <= 42 else "PHYSICAL")

        cust_type = "INDIVIDUAL" if i != 10 else "HUF"

        client_rows.append((
            client_code, form_number, cust_type, "2023-01-10", "STANDARD_PLAN",
            "ACCEPTED", "2023-01-11", "2023-01-10", f"AGT_{100 + (i % 71)}", None,
            "EQUITY_CASH", f"EMP_{4000 + (i % 25)}", "2023-01-10", "V3.0",
            user_id, f"WEB_USR_{i:03d}", "MARRIED" if i % 2 == 0 else "SINGLE",
            f"EDU_{(i % 4) + 1}", f"INC_{(i % 4) + 1}", f"HLD_{(i % 4) + 1}",
            is_nri, "N", "Y", "2023-01-12", "VERIFIED", "Y", "2023-01-12",
            "Y", "Y", "2023-01-13", "Y", None, None,
            "2023-01-10 09:30:00", f"EMP_{4000 + (i % 24)}", "2026-06-18 14:20:00",
            pan, f"CAT_{i % 25}", f"RM_{100 + (i % 20)}",
            nri_cat, nri_base, nri_curr, f"NAGT_{100 + (i % 95)}",
            "2023-01-10", "PRIVATE", "MONTHLY", demat_mand, "PREPAID_GOLD"
        ))

        # Account details
        account_rows.append((
            form_number, "RESIDENTIAL" if is_nri == "N" else "NRI",
            501000000000 + i, f"CUST_{80000 + i}", f"ICIC000{100 + i}",
            "SELF" if i % 2 == 0 else "JOINT", "2023-01-10", client_code,
            "2023-01-15", f"EMP_{4000 + (i % 25)}", f"EMP_{4000 + (i % 25)}",
            "2026-06-18 14:20:00", "Y", "SAVINGS" if i % 2 == 0 else "CURRENT"
        ))

        # Address details
        address_rows.append((
            form_number, "PERMANENT" if i % 2 == 0 else "CORRESPONDENCE",
            f"Flat {100 + i}, Tower {(i % 8) + 1}", f"Road {(i % 8) + 1}, Sector {i % 20}",
            city_info[0], city_info[1], "India", city_info[2],
            2200000000 + i, 2244000000 + i, 9820000000 + i, "Y",
            f"EMP_{4000 + (i % 23)}", "2023-01-10 09:30:00", f"EMP_{4000 + (i % 25)}",
            "2026-06-18 14:20:00", "Y", f"192.168.1.{i}", "SELF", city_info[2]
        ))

        # Personal details
        full_name = f"{fn} {mn + ' ' if mn else ''}{ln}"
        personal_rows.append((
            form_number, "APPLICANT", fn, mn, ln, dob, sex, "N", email,
            "India", "Indian", f"EMP_{4000 + (i % 25)}", "2023-01-10 09:30:00",
            f"EMP_{4000 + (i % 23)}", "2026-06-18 14:20:00", "Executive", "SELF",
            user_id, f"CAT_{(i % 5) + 1}", "MARRIED" if i % 2 == 0 else "SINGLE",
            "N", "2023-01-11", "INDIVIDUAL", f"192.168.1.{i}", "WEB", "N",
            "India", city_info[0], "SELF", 4000 + i, full_name, "VERIFIED", "Y"
        ))

    # Insert Users first, then Clients, then child tables
    cur.executemany("INSERT INTO v3_user_details VALUES (?,?,?,?,?,?,?,?,?,?,?);", user_rows)
    cur.executemany("INSERT INTO v3_client_details VALUES (" + ",".join(["?"] * 48) + ");", client_rows)
    cur.executemany("INSERT INTO v3_user_account_information VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);", account_rows)
    cur.executemany("INSERT INTO v3_user_address_details VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);", address_rows)
    cur.executemany("INSERT INTO v3_user_personal_details VALUES (" + ",".join(["?"] * 33) + ");", personal_rows)

    # 2. Generate Orders and Trades
    # Spec counts: 5,305 orders, 5,000 trades.
    # Exactly 5,000 orders have matching trades, and 305 orders are UNFILLED/CANCELLED with NO trades!
    TOTAL_ORDERS = 5305
    TOTAL_TRADES = 5000

    order_rows = []
    trade_rows = []

    # Dates: We need trades in May 2026, June 2026, July 2026
    # May 2026: 2026-05-01 to 2026-05-31
    # June 2026: 2026-06-01 to 2026-06-30
    # July 2026: 2026-07-01 to 2026-07-31
    # Specific test scenario setups:
    # - Client 8 (CL00108): Trades in May 2026, but NO trades in June 2026 (Scenario 6)
    # - Client 5 (CL00105): Inactive client who trades in July 2026 (Scenario 7)

    for ord_idx in range(1, TOTAL_ORDERS + 1):
        order_ref = f"ORD_{ord_idx:06d}"

        # Assign client
        if ord_idx <= TOTAL_TRADES:
            # For the first 5000 executed orders
            # Ensure every client gets at least 20 trades
            if ord_idx <= 2000:
                client_num = ((ord_idx - 1) % 100) + 1
            else:
                client_num = rng.randint(1, 100)

            # Scenario 6: Client 8 must trade in May but NOT in June
            # Scenario 7: Client 5 (Inactive) trades in July
            if client_num == 8:
                month = 5 # May only
                day = (ord_idx % 28) + 1
            elif client_num == 5:
                month = 7 # July
                day = (ord_idx % 28) + 1
            else:
                month = rng.choice([5, 6, 7])
                day = rng.randint(1, 28)

            trade_date_str = f"2026-{month:02d}-{day:02d}"
            order_status = "EXECUTED"
            exec_qty = rng.choice([10, 25, 50, 100, 200, 500])
        else:
            # The remaining 305 orders have NO trades (Scenario 8 & K)
            client_num = rng.randint(1, 100)
            month = rng.choice([5, 6, 7])
            day = rng.randint(1, 28)
            trade_date_str = f"2026-{month:02d}-{day:02d}"
            order_status = rng.choice(["CANCELLED", "REJECTED", "EXPIRED"])
            exec_qty = 0

        client_code = f"CL{100 + client_num:05d}"
        stock = stocks[(ord_idx - 1) % len(stocks)]
        flow = "BUY" if ord_idx % 2 == 1 else "SELL"
        order_qty = rng.choice([25, 50, 100, 200, 500, 1000])
        limit_rate = round(stock[2] * rng.uniform(0.97, 1.03), 2)
        trade_val = round(exec_qty * limit_rate, 2)
        brokerage = round(trade_val * 0.0005, 2)

        order_rows.append((
            order_ref, client_code, "NSE", stock[0], "CASH", flow, "CNC",
            order_qty, 1, "LIMIT", limit_rate, order_qty, order_status,
            trade_date_str, f"ACK_{ord_idx:07d}", exec_qty,
            round(order_qty * limit_rate, 2), brokerage, stock[1],
            "COMPLETED", exec_qty, 20.0, 10000 + ord_idx,
            800 + (ord_idx % 50), "EQUITY", "WEB", "AUTO",
            order_qty - exec_qty, "REGULAR", trade_date_str, "Y", "Y",
            trade_val, trade_date_str
        ))

        # If executed (first 5,000 orders), create the 1:1 matching trade
        if ord_idx <= TOTAL_TRADES:
            trade_ref = f"TRD_{ord_idx:06d}"
            sebi_chg = round(trade_val * 0.00001, 2)
            txn_chg = round(trade_val * 0.00003, 2)
            net_val = trade_val + brokerage + sebi_chg + txn_chg

            trade_rows.append((
                trade_ref, client_code, "NSE", stock[0], "CASH", 1,
                order_ref, trade_date_str, "NORMAL", flow,
                exec_qty, limit_rate, trade_val, brokerage, net_val,
                round(trade_val * 1.05, 2), 2000000000 + ord_idx,
                "Y", f"CN_{ord_idx:06d}", "Y", sebi_chg,
                f"USR_{client_code}", txn_chg
            ))

    cur.executemany("INSERT INTO v3_order_details_equity VALUES (" + ",".join(["?"] * 34) + ");", order_rows)
    cur.executemany("INSERT INTO v3_trade_details_equity VALUES (" + ",".join(["?"] * 23) + ");", trade_rows)

    conn.commit()
    print(f"[SUCCESS] Seeded {len(user_rows)} users, {len(client_rows)} clients, {len(order_rows)} orders, {len(trade_rows)} trades.")

def validate_data(conn):
    cur = conn.cursor()
    print("\n" + "="*50)
    print("STEP 6: DATA VALIDATION")
    print("="*50)

    # 1. Row counts
    tables = [
        ("v3_user_details", 100),
        ("v3_user_account_information", 100),
        ("v3_user_address_details", 100),
        ("v3_user_personal_details", 100),
        ("v3_client_details", 100),
        ("v3_order_details_equity", 5305),
        ("v3_trade_details_equity", 5000)
    ]
    all_counts_ok = True
    for tbl, expected in tables:
        cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        cnt = cur.fetchone()[0]
        status = "OK" if cnt == expected else "MISMATCH"
        if cnt != expected:
            all_counts_ok = False
        print(f"Table {tbl:<30}: {cnt:>5} rows (expected: {expected}) -> {status}")

    # 2. Foreign Key Check
    cur.execute("PRAGMA foreign_key_check;")
    fk_violations = cur.fetchall()
    print(f"PRAGMA foreign_key_check violations: {len(fk_violations)}")

    # 3. Primary Key Uniqueness
    pk_checks = [
        ("v3_user_details", "user_id"),
        ("v3_client_details", "client_code"),
        ("v3_user_account_information", "form_number"),
        ("v3_user_address_details", "form_number"),
        ("v3_user_personal_details", "form_number"),
        ("v3_order_details_equity", "order_reference"),
        ("v3_trade_details_equity", "trade_reference"),
    ]
    for tbl, pk in pk_checks:
        cur.execute(f"SELECT COUNT({pk}) - COUNT(DISTINCT {pk}) FROM {tbl};")
        dups = cur.fetchone()[0]
        print(f"PK Uniqueness on {tbl}.{pk}: {dups} duplicates (0 expected)")

    # 4. Nulls in key fields
    key_fields = [
        ("v3_user_details", "user_id"),
        ("v3_user_details", "client_code"),
        ("v3_client_details", "client_code"),
        ("v3_client_details", "form_number"),
        ("v3_client_details", "client_user_id"),
        ("v3_user_account_information", "form_number"),
        ("v3_user_account_information", "client_code"),
        ("v3_order_details_equity", "order_reference"),
        ("v3_order_details_equity", "client_code"),
        ("v3_trade_details_equity", "trade_reference"),
        ("v3_trade_details_equity", "client_code"),
        ("v3_trade_details_equity", "trade_order_reference"),
    ]
    for tbl, col in key_fields:
        cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE {col} IS NULL;")
        nulls = cur.fetchone()[0]
        print(f"Nulls in key {tbl}.{col}: {nulls} (0 expected)")

    # 5. Order -> Trade relationships
    cur.execute("""
    SELECT COUNT(*) FROM v3_trade_details_equity t
    LEFT JOIN v3_order_details_equity o ON t.trade_order_reference = o.order_reference
    WHERE o.order_reference IS NULL;
    """)
    orphan_trades = cur.fetchone()[0]
    print(f"Orphan Trades (without matching Order): {orphan_trades} (0 expected)")

    # 6. Orders without trades
    cur.execute("""
    SELECT COUNT(*) FROM v3_order_details_equity o
    LEFT JOIN v3_trade_details_equity t ON o.order_reference = t.trade_order_reference
    WHERE t.trade_reference IS NULL;
    """)
    unmatched_orders = cur.fetchone()[0]
    print(f"Unmatched Orders (orders without trades): {unmatched_orders} (305 expected)")

    # 7. Client -> Order & Client -> Trade relationships
    cur.execute("""
    SELECT COUNT(*) FROM v3_order_details_equity o
    LEFT JOIN v3_client_details c ON o.client_code = c.client_code
    WHERE c.client_code IS NULL;
    """)
    orphan_orders = cur.fetchone()[0]
    print(f"Orphan Orders (orders without valid Client): {orphan_orders} (0 expected)")

    cur.execute("""
    SELECT COUNT(*) FROM v3_trade_details_equity t
    LEFT JOIN v3_client_details c ON t.client_code = c.client_code
    WHERE c.client_code IS NULL;
    """)
    orphan_client_trades = cur.fetchone()[0]
    print(f"Orphan Trades (trades without valid Client): {orphan_client_trades} (0 expected)")

def run_sql_tests(conn):
    cur = conn.cursor()
    print("\n" + "="*50)
    print("STEP 7: SQL VALIDATION TESTS (A THROUGH K)")
    print("="*50)

    # A. Retrieve one client by Client Code
    print("\n--- Test A: Retrieve one client by Client Code (CL00101) ---")
    cur.execute("SELECT client_code, form_number, customer_type_individual_huf, client_pan_number, client_verify_status FROM v3_client_details WHERE client_code = 'CL00101';")
    res_a = cur.fetchone()
    print("Result:", res_a)

    # B. Retrieve all trades for one client
    print("\n--- Test B: Retrieve all trades for one client (CL00101) ---")
    cur.execute("SELECT COUNT(*), MIN(trade_date), MAX(trade_date) FROM v3_trade_details_equity WHERE client_code = 'CL00101';")
    res_b = cur.fetchone()
    print(f"Total trades for CL00101: {res_b[0]}, Date range: {res_b[1]} to {res_b[2]}")

    # C. Retrieve latest 5 trades for one client
    print("\n--- Test C: Retrieve latest 5 trades for one client (CL00101) ---")
    cur.execute("SELECT trade_reference, trade_stock_code, trade_flow_buy_sell, trade_executed_quantity, trade_value, trade_date FROM v3_trade_details_equity WHERE client_code = 'CL00101' ORDER BY trade_date DESC LIMIT 5;")
    res_c = cur.fetchall()
    for row in res_c:
        print(" ", row)

    # D. Retrieve all trades during July 2026
    print("\n--- Test D: Retrieve all trades during July 2026 ---")
    cur.execute("SELECT COUNT(*), SUM(trade_value) FROM v3_trade_details_equity WHERE trade_date >= '2026-07-01' AND trade_date <= '2026-07-31';")
    res_d = cur.fetchone()
    print(f"July 2026 trades count: {res_d[0]}, Total Value: Rs. {res_d[1]:,.2f}")

    # E. Count trades by client (Top 5)
    print("\n--- Test E: Count trades by client (Top 5) ---")
    cur.execute("SELECT client_code, COUNT(*) as trade_count FROM v3_trade_details_equity GROUP BY client_code ORDER BY trade_count DESC LIMIT 5;")
    res_e = cur.fetchall()
    for row in res_e:
        print(" ", row)

    # F. Calculate total trade value by client (Top 5)
    print("\n--- Test F: Calculate total trade value by client (Top 5) ---")
    cur.execute("SELECT client_code, COUNT(*) as trades, ROUND(SUM(trade_value), 2) as total_val FROM v3_trade_details_equity GROUP BY client_code ORDER BY total_val DESC LIMIT 5;")
    res_f = cur.fetchall()
    for row in res_f:
        print(" ", row)

    # G. Join Client Details -> Order Details
    print("\n--- Test G: Join Client Details -> Order Details (First 3) ---")
    cur.execute("""
    SELECT c.client_code, c.customer_type_individual_huf, o.order_reference, o.order_stock_code, o.order_status, o.order_trade_value
    FROM v3_client_details c
    JOIN v3_order_details_equity o ON c.client_code = o.client_code
    LIMIT 3;
    """)
    for row in cur.fetchall():
        print(" ", row)

    # H. Join Client Details -> Trade Details
    print("\n--- Test H: Join Client Details -> Trade Details (First 3) ---")
    cur.execute("""
    SELECT c.client_code, c.client_pan_number, t.trade_reference, t.trade_stock_code, t.trade_value, t.trade_date
    FROM v3_client_details c
    JOIN v3_trade_details_equity t ON c.client_code = t.client_code
    LIMIT 3;
    """)
    for row in cur.fetchall():
        print(" ", row)

    # I. Join Order Details -> Trade Details
    print("\n--- Test I: Join Order Details -> Trade Details (First 3) ---")
    cur.execute("""
    SELECT o.order_reference, o.order_stock_code, o.order_status, t.trade_reference, t.trade_executed_rate, t.trade_value
    FROM v3_order_details_equity o
    JOIN v3_trade_details_equity t ON o.order_reference = t.trade_order_reference
    LIMIT 3;
    """)
    for row in cur.fetchall():
        print(" ", row)

    # J. Join Client -> Order -> Trade
    print("\n--- Test J: Join Client -> Order -> Trade (First 3) ---")
    cur.execute("""
    SELECT c.client_code, c.customer_type_individual_huf, o.order_reference, t.trade_reference, t.trade_stock_code, t.trade_value
    FROM v3_client_details c
    JOIN v3_order_details_equity o ON c.client_code = o.client_code
    JOIN v3_trade_details_equity t ON o.order_reference = t.trade_order_reference
    LIMIT 3;
    """)
    for row in cur.fetchall():
        print(" ", row)

    # K. Identify orders without corresponding trades
    print("\n--- Test K: Identify orders without corresponding trades (Unfilled/Cancelled) ---")
    cur.execute("""
    SELECT o.order_reference, o.client_code, o.order_status, o.order_stock_code, o.order_quantity
    FROM v3_order_details_equity o
    LEFT JOIN v3_trade_details_equity t ON o.order_reference = t.trade_order_reference
    WHERE t.trade_reference IS NULL
    LIMIT 5;
    """)
    res_k = cur.fetchall()
    for row in res_k:
        print(" ", row)
    cur.execute("""
    SELECT COUNT(*) FROM v3_order_details_equity o
    LEFT JOIN v3_trade_details_equity t ON o.order_reference = t.trade_order_reference
    WHERE t.trade_reference IS NULL;
    """)
    print(f"Total orders without trades: {cur.fetchone()[0]}")

if __name__ == "__main__":
    conn = init_db()
    create_schema(conn)
    seed_data(conn)
    validate_data(conn)
    run_sql_tests(conn)
    conn.close()
