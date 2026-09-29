import { ScenarioQuestion } from "../types";

export const PYTHON_QUESTIONS: ScenarioQuestion[] = [
  {
    id: "py-1",
    type: "scenario",
    title: "Customer Contact String Normalization (Phone & Email)",
    domain: "Basic Python",
    difficulty: "Basic",
    estimatedMinutes: 10,
    scenarioContext:
      "Raw customer data feeds ingest unstandardized phone strings such as `'(555) 123-4567'`, `'555.123.4567'`, `'+1-555-123-4567'`, and `'5551234567'`. An L1 Python script is required to normalize these to the standard 10-digit format: `'(XXX) XXX-XXXX'`.",
    problemStatement:
      "Write a Python function `normalize_phone_number(raw_phone: str) -> str` that extracts digits from the input string. If the phone has 11 digits and starts with '1', strip the leading country code '1'. If exactly 10 digits remain, return the formatted string `'(XXX) XXX-XXXX'`. Otherwise, if the number has fewer or more than 10 digits, return `'INVALID'`.",
    businessRules: [
      "Extract only numeric characters `[0-9]` from `raw_phone`.",
      "If the extracted digit string has 11 digits and the first digit is `'1'`, strip the leading `'1'`.",
      "If the resulting digit count is exactly 10, format as `'(AAA) BBB-CCCC'` where AAA is area code, BBB is prefix, and CCCC is line number.",
      "For any input that does not result in 10 valid digits, return `'INVALID'`.",
      "Handle null/empty inputs gracefully by returning `'INVALID'`.",
    ],
    sampleTables: [
      {
        tableName: "raw_phone_feed",
        description: "Sample unformatted phone inputs",
        columns: ["input_phone", "expected_normalized"],
        rows: [
          { input_phone: "555.987.6543", expected_normalized: "(555) 987-6543" },
          { input_phone: "+1 (555) 123-4567", expected_normalized: "(555) 123-4567" },
          { input_phone: "5551234567", expected_normalized: "(555) 123-4567" },
          { input_phone: "123-45", expected_normalized: "INVALID" },
          { input_phone: "", expected_normalized: "INVALID" },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `import re

def normalize_phone_number(raw_phone: str) -> str:
    if not raw_phone:
        return "INVALID"
        
    digits = re.sub(r'\\D', '', str(raw_phone))
    
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
        
    if len(digits) == 10:
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"
        
    return "INVALID"`,
    testCases: [
      {
        id: "tc-1",
        name: "Standard 10-Digit Normalization",
        description: "Normalizes '555.987.6543' to '(555) 987-6543'.",
        inputDescription: "Dot-delimited 10-digit number",
        expectedOutputSummary: "'(555) 987-6543'",
      },
      {
        id: "tc-2",
        name: "Leading Country Code Stripping",
        description: "Strips leading '+1' from '+1 (555) 123-4567' to produce '(555) 123-4567'.",
        inputDescription: "11-digit string with country code 1",
        expectedOutputSummary: "'(555) 123-4567'",
      },
      {
        id: "tc-3",
        name: "Invalid Length Rejection",
        description: "Returns 'INVALID' for truncated input '123-45'.",
        inputDescription: "Truncated 5-digit number",
        expectedOutputSummary: "'INVALID'",
      },
    ],
    hints: [
      "Use `re.sub(r'\\D', '', str(raw_phone))` to extract only digits.",
      "Check `len(digits) == 11 and digits.startswith('1')`.",
      "Slice digits `digits[0:3]`, `digits[3:6]`, `digits[6:10]`.",
    ],
    concept: "Python Regular Expressions & String Standardization",
    evaluation: {
      type: "python",
      requiredFunctionName: "normalize_phone_number",
      requiredOperations: ["digit_extraction", "country_code_strip", "formatting", "invalid_check"],
      structuralChecks: [
        { id: "function_definition", label: "Defines normalize_phone_number", weight: 10, patterns: ["def normalize_phone_number", "normalize_phone_number"] },
        { id: "digit_extraction", label: "Extracts digits", weight: 5, patterns: ["re.sub", "\D", "isdigit()", "digits ="] },
        { id: "leading_country_code", label: "Handles leading country code", weight: 3, patterns: ["startswith('1')", 'startswith("1")', "len(digits) == 11"] },
        { id: "invalid_handler", label: "Returns INVALID for invalid lengths", weight: 2, patterns: ["INVALID", "return \"INVALID\""] },
      ],
    },
  },
  {
    id: "py-2",
    type: "scenario",
    title: "Record Deduplication & Missing Attribute Imputation",
    domain: "Basic Python",
    difficulty: "Basic",
    estimatedMinutes: 10,
    scenarioContext:
      "A batch of raw customer dictionaries arrived from an external lead vendor. Some records have duplicate emails (differing only in case or whitespace), some records have missing values for `country`, and some have missing `is_active` flags.",
    problemStatement:
      "Write a Python function `clean_and_deduplicate_records(records: list[dict]) -> list[dict]` that filters duplicates by email (case-insensitive, trimmed). Keep only the first occurrence of each distinct email. If a customer's `country` is missing or None, impute `'USA'`. If `is_active` is missing or None, default to `True`. Exclude records with empty or null emails.",
    businessRules: [
      "Trim whitespace and convert `email` to lowercase before checking for duplicates.",
      "Discard any record where `email` is null, None, or empty after trimming.",
      "Preserve the first occurrence of each normalized email.",
      "If `country` attribute is missing or None, set to `'USA'`.",
      "If `is_active` attribute is missing or None, set to `True`.",
      "Return the cleaned, deduplicated list of record dictionaries.",
    ],
    sampleTables: [
      {
        tableName: "raw_input_records",
        description: "List of raw incoming customer dictionaries",
        columns: ["id", "name", "email", "country", "is_active"],
        rows: [
          { id: 1, name: "Alice", email: "alice@domain.com", country: "Canada", is_active: true },
          { id: 2, name: "Alice Dup", email: "  ALICE@DOMAIN.COM ", country: "USA", is_active: false },
          { id: 3, name: "Bob", email: "bob@domain.com", country: null, is_active: null },
          { id: 4, name: "Ghost", email: "", country: "Mexico", is_active: true },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `def clean_and_deduplicate_records(records: list[dict]) -> list[dict]:
    clean_records = []
    seen_emails = set()
    
    for r in records:
        raw_email = r.get("email")
        if not raw_email or str(raw_email).strip() == "":
            continue
            
        norm_email = str(raw_email).strip().lower()
        if norm_email in seen_emails:
            continue
            
        seen_emails.add(norm_email)
        
        # Clone record to avoid mutation
        cleaned = dict(r)
        cleaned["email"] = norm_email
        
        if cleaned.get("country") is None:
            cleaned["country"] = "USA"
            
        if cleaned.get("is_active") is None:
            cleaned["is_active"] = True
            
        clean_records.append(cleaned)
        
    return clean_records`,
    testCases: [
      {
        id: "tc-1",
        name: "Case-Insensitive Deduplication",
        description: "Keeps the first record for 'alice@domain.com' and drops 'ALICE@DOMAIN.COM'.",
        inputDescription: "Duplicate Alice entries with different casing",
        expectedOutputSummary: "Only 1 Alice record preserved in output.",
      },
      {
        id: "tc-2",
        name: "Missing Attribute Default Imputation",
        description: "Imputes country = 'USA' and is_active = True for Bob's null attributes.",
        inputDescription: "Bob record with null country and is_active",
        expectedOutputSummary: "country == 'USA' and is_active == True.",
      },
      {
        id: "tc-3",
        name: "Empty Email Record Filtering",
        description: "Drops Ghost record with empty email string.",
        inputDescription: "Record with email = ''",
        expectedOutputSummary: "Ghost record excluded from output.",
      },
    ],
    hints: [
      "Use `seen_emails = set()` and `norm_email = str(email).strip().lower()` to track seen emails.",
      "Check `if cleaned.get('country') is None: cleaned['country'] = 'USA'`.",
      "Check `if cleaned.get('is_active') is None: cleaned['is_active'] = True`.",
    ],
    concept: "Basic Python Dictionaries, Sets, Filtering & Imputation",
  },
  {
    id: "py-3",
    type: "scenario",
    title: "Customer Payload Conflict Merging with Survivorship Rules",
    domain: "Basic Python",
    difficulty: "Intermediate",
    estimatedMinutes: 12,
    scenarioContext:
      "Two source payloads representing the same customer entity need to be merged into a single Golden Record dictionary. Payload A comes from CRM and Payload B comes from ERP.",
    problemStatement:
      "Write a Python function `merge_customer_payloads(payload_a: dict, payload_b: dict, preferred_source_for_email: str = 'ERP') -> dict` that merges two customer record dictionaries. For `email`, use the value from the `preferred_source_for_email` (if available and non-empty), otherwise fallback to the other. For all other attributes, non-null values take precedence over None.",
    businessRules: [
      "Attributes present in both dictionaries must be unified into a single output dict.",
      "If an attribute is present in both, prioritize non-empty values over None or empty strings.",
      "For `email`, prioritize the specified `preferred_source_for_email` ('CRM' or 'ERP') unless that value is None/empty.",
      "Return the unified Golden Customer Record dictionary.",
    ],
    sampleTables: [
      {
        tableName: "sample_payloads",
        description: "Input source dictionaries",
        columns: ["payload_a (CRM)", "payload_b (ERP)"],
        rows: [
          {
            "payload_a (CRM)": "{'id': '101', 'email': 'crm@corp.com', 'phone': '555-1234', 'tax_id': None}",
            "payload_b (ERP)": "{'id': '101', 'email': 'erp@corp.com', 'phone': None, 'tax_id': '99-88877'}",
          },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `def merge_customer_payloads(payload_a: dict, payload_b: dict, preferred_source: str = 'ERP') -> dict:
    golden = {}
    all_keys = set(payload_a.keys()).union(set(payload_b.keys()))
    
    for key in all_keys:
        val_a = payload_a.get(key)
        val_b = payload_b.get(key)
        
        if key == "email":
            pref = payload_b if preferred_source == "ERP" else payload_a
            other = payload_a if preferred_source == "ERP" else payload_b
            golden[key] = pref.get(key) if pref.get(key) else other.get(key)
        else:
            # Non-null priority
            if val_a is not None and str(val_a).strip() != "":
                golden[key] = val_a
            else:
                golden[key] = val_b
                
    return golden`,
    testCases: [
      {
        id: "tc-1",
        name: "Email Preference Precedence",
        description: "Selects ERP email when preferred_source is 'ERP'.",
        inputDescription: "CRM email 'crm@corp.com' and ERP email 'erp@corp.com'",
        expectedOutputSummary: "golden['email'] == 'erp@corp.com'",
      },
      {
        id: "tc-2",
        name: "Null Fallback Merging",
        description: "Populates tax_id from ERP and phone from CRM.",
        inputDescription: "Missing phone in ERP and missing tax_id in CRM",
        expectedOutputSummary: "Both phone and tax_id populated in golden record",
      },
    ],
    hints: [
      "Combine keys with `set(payload_a.keys()).union(set(payload_b.keys()))`.",
      "Check `preferred_source` when key is 'email'.",
    ],
    concept: "Python Data Merging, Survivorship Precedence & Dictionary Synthesis",
  },
  {
    id: "py-4",
    type: "scenario",
    title: "Address Postal Code Standardization (ZIP & ZIP+4)",
    domain: "Basic Python",
    difficulty: "Basic",
    estimatedMinutes: 10,
    scenarioContext:
      "Staging postal codes arrive in inconsistent formats from legacy Excel sheets and web forms, including `'90210'`, `'90210.0'`, `'701'` (missing leading zeros), and 9-digit strings `'123456789'`.",
    problemStatement:
      "Write a Python function `standardize_postal_code(raw_zip: str) -> str` that standardizes US zip codes. If the input ends with `.0`, strip it. Extract all digits: if 5 digits, return as-is; if 1 to 4 digits, pad with leading zeros to 5 digits (e.g. `'701'` -> `'00701'`); if 9 digits, format as `'12345-6789'`. For all other lengths or empty inputs, return `'INVALID'`.",
    businessRules: [
      "Strip leading/trailing whitespace. If the string ends with `.0`, remove `.0`.",
      "Extract only digits `[0-9]`.",
      "If digit length is between 1 and 4, left-pad with `'0'` to length 5.",
      "If digit length is exactly 5, return the 5-digit string.",
      "If digit length is exactly 9, format as `'{digits[:5]}-{digits[5:]}'`.",
      "For any other digit length (0, 6, 7, 8, or >9), return `'INVALID'`.",
    ],
    sampleTables: [
      {
        tableName: "raw_zip_samples",
        description: "Raw postal codes and standardized outputs",
        columns: ["raw_zip", "expected_output"],
        rows: [
          { raw_zip: "90210", expected_output: "90210" },
          { raw_zip: "90210.0", expected_output: "90210" },
          { raw_zip: "701", expected_output: "00701" },
          { raw_zip: "123456789", expected_output: "12345-6789" },
          { raw_zip: "12", expected_output: "00012" },
          { raw_zip: "ABCDE", expected_output: "INVALID" },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `import re

def standardize_postal_code(raw_zip: str) -> str:
    if not raw_zip:
        return "INVALID"
        
    s = str(raw_zip).strip()
    if s.endswith(".0"):
        s = s[:-2]
        
    digits = re.sub(r'\\D', '', s)
    
    if 1 <= len(digits) <= 4:
        return digits.zfill(5)
    elif len(digits) == 5:
        return digits
    elif len(digits) == 9:
        return f"{digits[:5]}-{digits[5:]}"
    else:
        return "INVALID"`,
    testCases: [
      {
        id: "tc-1",
        name: "Standard 5-Digit and Float Strip",
        description: "Standardizes '90210.0' to '90210'.",
        inputDescription: "Float zip '90210.0'",
        expectedOutputSummary: "'90210'",
      },
      {
        id: "tc-2",
        name: "Leading Zero Padding",
        description: "Pads '701' with leading zeros to '00701'.",
        inputDescription: "3-digit zip '701'",
        expectedOutputSummary: "'00701'",
      },
      {
        id: "tc-3",
        name: "ZIP+4 9-Digit Formatting",
        description: "Formats '123456789' as '12345-6789'.",
        inputDescription: "9-digit zip '123456789'",
        expectedOutputSummary: "'12345-6789'",
      },
    ],
    hints: [
      "Use `s.endswith('.0')` to clean float inputs.",
      "Use `digits.zfill(5)` to pad numbers shorter than 5 digits.",
    ],
    concept: "String Cleansing, Postal Standardization & Padding",
  },
  {
    id: "py-5",
    type: "scenario",
    title: "Fuzzy Match Jaccard Similarity for Legal Entity Names",
    domain: "Basic Python",
    difficulty: "Intermediate",
    estimatedMinutes: 10,
    scenarioContext:
      "MDM probabilistic match engines compare organization names by tokenizing text into word sets and computing similarity coefficients while filtering noise stop-words like 'Corp' and 'LLC'.",
    problemStatement:
      "Write a Python function `calculate_token_jaccard(name_a: str, name_b: str) -> float` that tokenizes both strings into lowercase words, strips punctuation, removes legal corporate suffixes (`'corp'`, `'corporation'`, `'inc'`, `'incorporated'`, `'llc'`, `'ltd'`), and computes the Jaccard similarity index: `len(set_a & set_b) / len(set_a | set_b)` rounded to 2 decimal places. Return `0.0` if either set is empty.",
    businessRules: [
      "Convert names to lowercase and extract word tokens `[a-z0-9]+`.",
      "Filter out corporate suffix stop-words: `{'corp', 'corporation', 'inc', 'incorporated', 'llc', 'ltd'}`.",
      "If the union of the two token sets is empty, return `0.0`.",
      "Calculate Jaccard index: `intersection / union`.",
      "Return the result rounded to 2 decimal places.",
    ],
    sampleTables: [
      {
        tableName: "sample_name_pairs",
        description: "Name pairs and expected Jaccard scores",
        columns: ["name_a", "name_b", "expected_similarity"],
        rows: [
          { name_a: "Acme Healthcare LLC", name_b: "Acme Healthcare Corp", expected_similarity: 1.0 },
          { name_a: "Acme Pharma Inc", name_b: "Acme Logistics Ltd", expected_similarity: 0.33 },
          { name_a: "Blue Sky", name_b: "Red Ocean", expected_similarity: 0.0 },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `import re

def calculate_token_jaccard(name_a: str, name_b: str) -> float:
    stop_words = {"corp", "corporation", "inc", "incorporated", "llc", "ltd"}
    
    tokens_a = {
        w for w in re.findall(r'[a-z0-9]+', (name_a or '').lower())
        if w not in stop_words
    }
    tokens_b = {
        w for w in re.findall(r'[a-z0-9]+', (name_b or '').lower())
        if w not in stop_words
    }
    
    union = tokens_a | tokens_b
    if not union:
        return 0.0
        
    intersection = tokens_a & tokens_b
    return round(len(intersection) / len(union), 2)`,
    testCases: [
      {
        id: "tc-1",
        name: "Identical Core Name with Different Legal Suffixes",
        description: "Matches 'Acme Healthcare LLC' and 'Acme Healthcare Corp' with 1.0 similarity.",
        inputDescription: "Names differing only in corporate suffixes",
        expectedOutputSummary: "1.0",
      },
      {
        id: "tc-2",
        name: "Partial Token Overlap",
        description: "Compares 'Acme Pharma Inc' and 'Acme Logistics Ltd' -> Jaccard 0.33.",
        inputDescription: "1 shared token out of 3 total distinct tokens",
        expectedOutputSummary: "0.33",
      },
    ],
    hints: [
      "Use `re.findall(r'[a-z0-9]+', text.lower())` to extract alphanumeric tokens.",
      "Set operations: `tokens_a & tokens_b` for intersection, `tokens_a | tokens_b` for union.",
    ],
    concept: "Tokenization, Stop-word Filtering & Jaccard Similarity",
  },
  {
    id: "py-6",
    type: "scenario",
    title: "Data Quality Attribute Completeness Score Calculator",
    domain: "Basic Python",
    difficulty: "Basic",
    estimatedMinutes: 10,
    scenarioContext:
      "Enterprise Data Stewards monitor customer records for Data Quality compliance. A record must be measured for attribute completeness against a list of mandatory fields.",
    problemStatement:
      "Write a Python function `calculate_record_completeness(record: dict, mandatory_fields: list[str]) -> dict` that evaluates attribute completeness. A field is considered missing if it is not present in `record`, its value is `None`, or its string representation is empty/whitespace. Return a dictionary containing: `missing_fields` (sorted list), `completeness_percentage` (float rounded to 1 decimal place), and `is_stewardship_required` (boolean: True if completeness is below 80.0%, else False).",
    businessRules: [
      "Check each field in `mandatory_fields`.",
      "A field is missing if `record.get(field) is None` or `str(record.get(field)).strip() == ''`.",
      "`missing_fields`: alphabetically sorted list of missing mandatory field names.",
      "`completeness_percentage`: `round(((total_mandatory - missing_count) / total_mandatory) * 100.0, 1)`. If `mandatory_fields` is empty, return 100.0.",
      "`is_stewardship_required`: True if `completeness_percentage < 80.0`, else False.",
      "Return `{'missing_fields': [...], 'completeness_percentage': float, 'is_stewardship_required': bool}`.",
    ],
    sampleTables: [
      {
        tableName: "sample_record_eval",
        description: "Sample customer dictionary and mandatory fields",
        columns: ["record", "mandatory_fields", "expected_completeness"],
        rows: [
          {
            record: "{'name': 'Apex', 'email': 'info@apex.com', 'phone': None, 'tax_id': ''}",
            mandatory_fields: "['name', 'email', 'phone', 'tax_id']",
            expected_completeness: "{'missing_fields': ['phone', 'tax_id'], 'completeness_percentage': 50.0, 'is_stewardship_required': True}",
          },
        ],
      },
    ],
    language: "python",
    starterCode: "",
    solutionReference: `def calculate_record_completeness(record: dict, mandatory_fields: list[str]) -> dict:
    if not mandatory_fields:
        return {
            "missing_fields": [],
            "completeness_percentage": 100.0,
            "is_stewardship_required": False
        }
        
    missing = []
    for field in mandatory_fields:
        val = record.get(field)
        if val is None or str(val).strip() == "":
            missing.append(field)
            
    missing_sorted = sorted(missing)
    total = len(mandatory_fields)
    completed = total - len(missing)
    percentage = round((completed / total) * 100.0, 1)
    
    return {
        "missing_fields": missing_sorted,
        "completeness_percentage": percentage,
        "is_stewardship_required": percentage < 80.0
    }`,
    testCases: [
      {
        id: "tc-1",
        name: "Partial Completeness & Stewardship Flag",
        description: "Evaluates 2 out of 4 fields present -> 50.0% completeness and requires stewardship.",
        inputDescription: "Record with missing phone and empty tax_id",
        expectedOutputSummary: "completeness_percentage == 50.0 and is_stewardship_required == True",
      },
      {
        id: "tc-2",
        name: "Full Completeness",
        description: "Evaluates all 3 mandatory fields present -> 100.0% completeness.",
        inputDescription: "Fully populated record",
        expectedOutputSummary: "completeness_percentage == 100.0 and is_stewardship_required == False",
      },
    ],
    hints: [
      "Check `val is None or str(val).strip() == ''` for missingness.",
      "Sort missing fields using `sorted(missing)`.",
    ],
    concept: "Data Quality Completeness KPI Calculation & Stewardship Triage",
  },
];
