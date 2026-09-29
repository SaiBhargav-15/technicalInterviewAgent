import { MDMTopicQuestion } from "../types";

export const MDM_QUESTIONS: MDMTopicQuestion[] = [
  {
    id: "mdm-1",
    type: "mdm",
    title: "Stewardship – Data Quality Investigation",
    topic: "Data Stewardship",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "A data steward notices that several HCPs have different addresses from different sources. The CRM address is frequently outdated, while a third-party provider has more recent addresses. However, some third-party addresses contain formatting errors.",
    sampleTables: [
      {
        tableName: "source_address_records",
        description: "Contributing HCP addresses from multiple source systems",
        columns: ["source_system", "hcp_id", "address_line1", "city", "state", "postal_code", "data_quality_flag", "last_update_date"],
        rows: [
          { source_system: "CRM", hcp_id: "HCP-101", address_line1: "123 Elm St", city: "Springfield", state: "IL", postal_code: "62701", data_quality_flag: "Valid", last_update_date: "2023-04-12" },
          { source_system: "3RD_PARTY", hcp_id: "HCP-101", address_line1: "123 Elm St., Suite 4B", city: "Sprngfld", state: "IL", postal_code: "62701", data_quality_flag: "Formatting Warning", last_update_date: "2026-07-20" },
          { source_system: "VEEVA", hcp_id: "HCP-101", address_line1: "123 Elm Street Ste 4B", city: "Springfield", state: "IL", postal_code: "62701", data_quality_flag: "Valid", last_update_date: "2026-08-01" },
        ],
      },
    ],
    questionText:
      "The steward wants to improve the data without blindly overwriting existing values. What would be the most appropriate approach?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Delete the CRM addresses and use the third-party addresses as the only source of truth.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Review the contributing values and source information, validate questionable values, and use the configured survivorship/governance process to determine the Operational Value.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Change the Match Rule so that addresses from the third-party provider automatically replace CRM addresses.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Manually update the Operational Value for every affected HCP and ignore the contributing source values.",
      },
    ],
    correctOptionId: "opt-b",
    governanceGuideline:
      "Data Stewards govern address conflicts by evaluating contributing values, validating formatting errors, and leveraging configured survivorship/governance workflows to compute the Operational Value rather than arbitrarily deleting records or overriding source provenance.",
  },
  {
    id: "mdm-2",
    type: "mdm",
    title: "Match – Potential Duplicate With Conflicting Data",
    topic: "Match & Merge",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "Reltio identifies two HCP records as potential duplicates.\n\nRecord A:\n• Name: Robert Johnson\n• DOB: 12-Jan-1975\n• NPI: 1234567890\n• Address: 100 Main St\n\nRecord B:\n• Name: Robert Johnson\n• DOB: 12-Jan-1975\n• NPI: 1234567890\n• Address: 200 Main St\n\nThe match rule heavily relies on NPI and DOB. The records are presented to a steward for review.",
    sampleTables: [
      {
        tableName: "potential_duplicate_pair",
        description: "Candidate duplicate records flagged by match engine",
        columns: ["record_id", "hcp_name", "date_of_birth", "npi_number", "practice_address", "match_confidence"],
        rows: [
          { record_id: "Record A (CRM)", hcp_name: "Robert Johnson", date_of_birth: "1975-01-12", npi_number: "1234567890", practice_address: "100 Main St, Chicago, IL", match_confidence: "94%" },
          { record_id: "Record B (Veeva)", hcp_name: "Robert Johnson", date_of_birth: "1975-01-12", npi_number: "1234567890", practice_address: "200 Main St, Chicago, IL", match_confidence: "94%" },
        ],
      },
    ],
    questionText:
      "What should the steward primarily determine before merging?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Which record has the highest number of attributes populated",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Whether the records represent the same real-world HCP, considering the matching evidence and conflicting information",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Which source has the highest survivorship priority",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Whether the address difference should automatically prevent the merge",
      },
    ],
    correctOptionId: "opt-b",
    governanceGuideline:
      "Before approving a potential merge in MDM, the steward's primary duty is to determine if both profiles represent the same real-world entity, weighing strong match evidence (identical NPI and DOB) against conflicting attributes (e.g. secondary practice location vs distinct entity).",
  },
  {
    id: "mdm-3",
    type: "mdm",
    title: "Match Rules – Why Are Records Not Matching?",
    topic: "Match & Merge",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "A business reports that duplicate HCPs are not being detected.\n\nYou investigate two records:\n\n| Attribute | Record 1 | Record 2 |\n|---|---|---|\n| Name | Jonathan Smith | Jon Smith |\n| DOB | 10/05/1980 | 10/05/1980 |\n| NPI | 1234567890 | 1234567890 |\n| Address | 10 Main Street | 10 Main St |\n\nThe business expects these records to match, but Reltio is not identifying them as duplicates.",
    sampleTables: [
      {
        tableName: "unmatched_duplicate_candidates",
        description: "HCP records failing exact match comparison method",
        columns: ["attribute_name", "record_1_crm", "record_2_leads", "comparison_type", "match_status"],
        rows: [
          { attribute_name: "Name", record_1_crm: "Jonathan Smith", record_2_leads: "Jon Smith", comparison_type: "Exact configured", match_status: "No Match" },
          { attribute_name: "DOB", record_1_crm: "1980-05-10", record_2_leads: "1980-05-10", comparison_type: "Exact configured", match_status: "Match" },
          { attribute_name: "NPI", record_1_crm: "1234567890", record_2_leads: "1234567890", comparison_type: "Exact configured", match_status: "Match" },
          { attribute_name: "Address", record_1_crm: "10 Main Street", record_2_leads: "10 Main St", comparison_type: "Exact configured", match_status: "No Match" },
        ],
      },
    ],
    questionText:
      "Which investigation is most relevant?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Check the survivorship rule for Name",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Check whether the configured Match Rules include the relevant identifiers/attributes and whether their matching conditions and comparison methods support these values",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Change the source priority for Address",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Manually merge the records and assume the Match Rule is working correctly",
      },
    ],
    correctOptionId: "opt-b",
    governanceGuideline:
      "When expected duplicates fail to match, the engineer must verify whether match rules include the attributes (NPI, DOB, Name, Address) and whether configured comparison methods (e.g. Exact vs Cleanse/Fuzzy for 'Street' vs 'St' or 'Jonathan' vs 'Jon') support these variations.",
  },
  {
    id: "mdm-4",
    type: "mdm",
    title: "Survivorship – Different Attributes, Different Sources",
    topic: "Survivorship",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "After two HCP records are consolidated, the surviving values are:\n\n| Attribute | CRM | Veeva |\n|---|---|---|\n| Name | John Smith | Jon Smith |\n| Phone | 111-1111 | 222-2222 |\n| Email | john@crm.com | john@veeva.com |\n\nBusiness requirements are:\n• CRM has highest priority for Name\n• Veeva has highest priority for Phone\n• Most recently updated valid value should survive for Email",
    sampleTables: [
      {
        tableName: "attribute_survivorship_staged_values",
        description: "Contributing values by source and business survivorship priority",
        columns: ["attribute", "crm_source_value", "veeva_source_value", "business_rule", "surviving_winner"],
        rows: [
          { attribute: "Name", crm_source_value: "John Smith", veeva_source_value: "Jon Smith", business_rule: "CRM Priority #1", surviving_winner: "John Smith (CRM)" },
          { attribute: "Phone", crm_source_value: "111-1111", veeva_source_value: "222-2222", business_rule: "Veeva Priority #1", surviving_winner: "222-2222 (Veeva)" },
          { attribute: "Email", crm_source_value: "john@crm.com (Old)", veeva_source_value: "john@veeva.com (Recent)", business_rule: "Most Recent LUD", surviving_winner: "john@veeva.com (Veeva)" },
        ],
      },
    ],
    questionText:
      "What should you expect from the survivorship configuration?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "One source priority must be applied to all three attributes.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Match rules should determine the surviving value for each attribute.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Different survivorship configurations can be applied to the relevant attributes so that each attribute follows its business-specific strategy.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "The source that created the golden entity determines all surviving values.",
      },
    ],
    correctOptionId: "opt-c",
    governanceGuideline:
      "Modern MDM platforms support granular, attribute-level survivorship strategies: Name follows CRM source priority, Phone follows Veeva source priority, and Email follows recency/LUD strategy.",
  },
  {
    id: "mdm-5",
    type: "mdm",
    title: "Match vs Survivorship – Important Distinction",
    topic: "Survivorship",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "Two records have:\n• Same NPI\n• Same DOB\n• Similar names\n• Different phone numbers\n\nThe Match Rule considers them a strong match. However, after consolidation, the business wants the phone number from the CRM source to be displayed because CRM has the highest source priority for Phone.",
    sampleTables: [
      {
        tableName: "match_vs_survivorship_comparison",
        description: "Cross-system match linkage vs attribute operational value selection",
        columns: ["source_cross_ref", "npi", "dob", "provider_name", "phone_number", "phone_priority"],
        rows: [
          { source_cross_ref: "CRM-801", npi: "1457896321", dob: "1982-11-20", provider_name: "Sarah Jenkins, MD", phone_number: "312-555-0199", phone_priority: "Rank 1 (Highest)" },
          { source_cross_ref: "BILLING-402", npi: "1457896321", dob: "1982-11-20", provider_name: "Dr. Sarah Jenkins", phone_number: "312-555-8844", phone_priority: "Rank 2" },
        ],
      },
    ],
    questionText:
      "Which statement is most accurate?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Because the phone numbers are different, the records cannot be matched.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "The Match Rule determines which phone number becomes the Operational Value.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Matching can determine that the records represent the same entity, while Survivorship can independently determine which Phone value becomes the Operational Value.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "The steward must manually delete the lower-priority phone number before the records can be merged.",
      },
    ],
    correctOptionId: "opt-c",
    governanceGuideline:
      "Matching and Survivorship are fundamentally decoupled. Matching links multiple source cross-references into an entity cluster, while Survivorship evaluates source priorities, recency, and rules to compute each attribute's Operational Value (OV).",
  },
  {
    id: "mdm-6",
    type: "mdm",
    title: "Real-World Stewardship Scenario – Match + Merge + Survivorship",
    topic: "Data Stewardship",
    difficulty: "Basic",
    estimatedMinutes: 5,
    scenarioContext:
      "An HCP has three source records:\n\n| Source | Name | NPI | Phone | Address |\n|---|---|---|---|---|\n| CRM | Dr. Michael Brown | 9876543210 | 111-1111 | 10 Main St |\n| Veeva | Michael Brown | 9876543210 | 222-2222 | 10 Main Street |\n| Vendor | M Brown | 9876543210 | 333-3333 | 12 Main St |\n\nThe Match Rule identifies all three as the same HCP. The business has configured:\n• Veeva → highest priority for Phone\n• CRM → highest priority for Address\n• Vendor → lowest priority for both\n• Name → survivorship based on the configured source/attribute strategy\n\nA steward is reviewing the records.",
    sampleTables: [
      {
        tableName: "three_way_hcp_consolidation",
        description: "Contributing source feeds and attribute priorities for unified golden record",
        columns: ["source_system", "provider_name", "npi", "phone", "office_address", "assigned_priority"],
        rows: [
          { source_system: "CRM", provider_name: "Dr. Michael Brown", npi: "9876543210", phone: "111-1111", office_address: "10 Main St", assigned_priority: "Address Priority #1" },
          { source_system: "Veeva", provider_name: "Michael Brown", npi: "9876543210", phone: "222-2222", office_address: "10 Main Street", assigned_priority: "Phone Priority #1" },
          { source_system: "Vendor", provider_name: "M Brown", npi: "9876543210", phone: "333-3333", office_address: "12 Main St", assigned_priority: "Lowest Priority" },
        ],
      },
    ],
    questionText:
      "Which statement best describes what the steward should expect?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Because all three records matched, Reltio will automatically select all values from Veeva.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "The Match Rule determines the surviving Phone and Address values based on source priority.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "The records can be consolidated as the same HCP, while survivorship independently determines the Operational Value for each attribute according to its configured strategy.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "The steward should manually delete the Vendor record before Reltio can consolidate the records.",
      },
    ],
    correctOptionId: "opt-c",
    governanceGuideline:
      "Consolidation merges the three source cross-references into a unified HCP entity. Survivorship then independently applies attribute-specific strategies: Veeva's Phone survives, CRM's Address survives, and Name survives per configured source priority.",
  },
  {
    id: "mdm-7",
    type: "mdm",
    title: "Pharma HCP Resolution - Conflicting Provider Evidence",
    topic: "Match & Merge",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    scenarioContext:
      "A pharmaceutical company receives two HCP profiles from its CRM and a provider reference vendor. Both contain the same NPI and date of birth, and their names are close variants. The profiles list different specialties and practice locations. The vendor record was refreshed recently, but the CRM record includes a source-system identifier and prior steward notes.",
    sampleTables: [
      {
        tableName: "hcp_match_candidates",
        description: "Potential HCP duplicates from commercial and reference sources",
        columns: ["source", "hcp_name", "npi", "date_of_birth", "specialty", "practice_location", "updated_at"],
        rows: [
          { source: "CRM", hcp_name: "Dr. Maya Chen", npi: "1467823901", date_of_birth: "1979-04-18", specialty: "Oncology", practice_location: "Boston, MA", updated_at: "2025-11-02" },
          { source: "Reference Vendor", hcp_name: "Maya J. Chen, MD", npi: "1467823901", date_of_birth: "1979-04-18", specialty: "Hematology/Oncology", practice_location: "Cambridge, MA", updated_at: "2026-08-14" },
        ],
      },
    ],
    questionText:
      "What is the best next step before resolving these profiles as a single HCP?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Automatically merge them because an identical NPI is sufficient evidence, regardless of source quality or conflicting attributes.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Reject the match because two profiles for the same HCP must have identical specialties and practice locations.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Validate the NPI and supporting identity evidence against trusted sources, review provenance and prior steward notes, then approve or reject the match while retaining source-level values.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Keep only the more recently updated vendor profile and discard the CRM profile and its lineage.",
      },
    ],
    correctOptionId: "opt-c",
    governanceGuideline:
      "Strong identifiers such as NPI support identity resolution but should be assessed with source reliability, lineage, and conflicting evidence. Specialty and practice location can legitimately vary; preserve contributing values and steward decisions rather than discarding provenance.",
  },
  {
    id: "mdm-8",
    type: "mdm",
    title: "Pharma HCO Hierarchy - Parent System and Care Site",
    topic: "Data Stewardship",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    scenarioContext:
      "A life sciences account master receives a health system record and a hospital-site record from separate commercial feeds. The site uses the health system's mailing address, but has its own facility identifier, contracting activity, and local account owner. Sales operations needs both system-level rollups and site-level territory assignments.",
    sampleTables: [
      {
        tableName: "pharma_hco_hierarchy_candidates",
        description: "Health system and delivery-site records from commercial sources",
        columns: ["source", "account_name", "facility_id", "parent_system", "address", "local_owner"],
        rows: [
          { source: "CRM", account_name: "Northstar Health System", facility_id: "SYS-410", parent_system: null, address: "80 Harbor Way, Boston, MA", local_owner: "National Accounts" },
          { source: "Territory Feed", account_name: "Northstar Oncology - West Campus", facility_id: "SITE-417", parent_system: "SYS-410", address: "80 Harbor Way, Boston, MA", local_owner: "New England Oncology" },
        ],
      },
    ],
    questionText:
      "How should the master data team model these records to support both rollups and site-level operations?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Merge the site into the health system because the mailing addresses match, then assign all activity to the national account.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Keep distinct system and site entities, validate their source identifiers, and represent the site-to-system relationship in the HCO hierarchy.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Create two unrelated golden records because different commercial feeds cannot contribute to the same hierarchy.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Replace the site facility identifier with the parent system identifier so territory assignments roll up automatically.",
      },
    ],
    correctOptionId: "opt-b",
    governanceGuideline:
      "A health system and an operational care site can be distinct HCO entities even when they share an address. Preserve their identifiers and model the validated parent-child relationship so commercial activity can be analyzed at both levels.",
  },
  {
    id: "mdm-9",
    type: "mdm",
    title: "Pharma Product Master - Medicinal Product vs Package",
    topic: "Match & Merge",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    scenarioContext:
      "A pharmaceutical product master receives records for the same branded medicine in two strengths and three package configurations. A broad match rule uses brand name and active ingredient, so it proposes merging all records. Downstream teams need a medicinal-product rollup as well as accurate package-level ordering and inventory.",
    sampleTables: [
      {
        tableName: "pharma_product_match_candidates",
        description: "Product and package-level records from manufacturer and ERP feeds",
        columns: ["source", "brand", "active_ingredient", "strength", "dosage_form", "package_configuration", "gtin"],
        rows: [
          { source: "Manufacturer", brand: "Cardiovex", active_ingredient: "examplex", strength: "10 mg", dosage_form: "tablet", package_configuration: "30-count bottle", gtin: "00345678901234" },
          { source: "ERP", brand: "Cardiovex", active_ingredient: "examplex", strength: "20 mg", dosage_form: "tablet", package_configuration: "30-count bottle", gtin: "00345678905678" },
          { source: "ERP", brand: "Cardiovex", active_ingredient: "examplex", strength: "10 mg", dosage_form: "tablet", package_configuration: "100-count bottle", gtin: "00345678909876" },
        ],
      },
    ],
    questionText:
      "Which change best prevents false merges while preserving useful product rollups?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Merge all records with the same brand and active ingredient, then let the latest package description survive.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Treat every different GTIN as a different active ingredient and prohibit any relationship between the records.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Define the mastered entity granularity, match package records using validated package identifiers and product attributes, and relate distinct packages or strengths to their appropriate product-level parent.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Use brand name alone for matching because strength and package configuration are inventory attributes rather than identity attributes.",
      },
    ],
    correctOptionId: "opt-c",
    governanceGuideline:
      "Product identity depends on the mastered entity level. Strength, dosage form, and package configuration can distinguish orderable products or packs; validated package identifiers support that level, while explicit relationships preserve higher-level medicinal-product rollups.",
  },
  {
    id: "mdm-10",
    type: "mdm",
    title: "Pharma Product Survivorship - Regulatory Status and Provenance",
    topic: "Survivorship",
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    scenarioContext:
      "A manufacturer combines a regulatory reference feed, its approved ERP product catalog, and a CRM feed. The regulatory feed is authoritative for regulatory market status, ERP is authoritative for the approved commercial product name, and the business allows recency to break ties only between values from equally trusted sources. A recent CRM update conflicts with the regulatory status.",
    sampleTables: [
      {
        tableName: "pharma_product_survivorship_values",
        description: "Contributing values with source authority and update dates",
        columns: ["source", "product_id", "commercial_name", "market_status", "status_effective_date", "updated_at"],
        rows: [
          { source: "Regulatory Reference", product_id: "PRD-204", commercial_name: "Cardiovex 10 mg", market_status: "Marketed", status_effective_date: "2026-03-01", updated_at: "2026-07-14" },
          { source: "ERP", product_id: "PRD-204", commercial_name: "Cardiovex 10 mg Tablets", market_status: "Active", status_effective_date: null, updated_at: "2026-06-22" },
          { source: "CRM", product_id: "PRD-204", commercial_name: "Cardiovex 10mg", market_status: "Discontinued", status_effective_date: null, updated_at: "2026-08-19" },
        ],
      },
    ],
    questionText:
      "Which survivorship design best honors the stated governance rules?",
    options: [
      {
        id: "opt-a",
        label: "A",
        text: "Use the most recently updated record as the source for every product attribute, so the CRM values win.",
      },
      {
        id: "opt-b",
        label: "B",
        text: "Apply attribute-level source authority: take regulatory status from the regulatory feed and the approved commercial name from ERP, preserving lineage and effective dates.",
      },
      {
        id: "opt-c",
        label: "C",
        text: "Always use the regulatory feed for every attribute because one authoritative source is easier to govern.",
      },
      {
        id: "opt-d",
        label: "D",
        text: "Concatenate all source values into the operational fields and ask downstream users to choose the correct value.",
      },
    ],
    correctOptionId: "opt-b",
    governanceGuideline:
      "Survivorship should follow field-specific authority: the regulatory reference governs regulatory status, while the approved ERP catalog governs the commercial name. Preserve source lineage and effective dates; use recency only as a tie-breaker among comparably trusted values.",
  },
];
