import { ScenarioQuestion, SQLMultipleChoiceQuestion } from "../types";

export const SQL_QUESTIONS: Array<ScenarioQuestion | SQLMultipleChoiceQuestion> = [
{
  id: "sql-hcp-1",
  type: "scenario",
  title: "HCP and HCO Affiliation Details",
  domain: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 8,

  scenarioContext:
    "You are working with healthcare provider master data. The hcp table stores healthcare professionals, the hco table stores healthcare organizations, and the affiliations table stores relationships between HCPs and HCOs.",

  problemStatement:
    "Write a SQL query to return the HCP ID, HCP name, HCO name, and specialty for all HCP affiliations.",

  businessRules: [
    "Join hcp to affiliations using hcp_id.",
    "Join affiliations to hco using hco_id.",
    "Return only HCPs that have an affiliation.",
    "Output columns: hcp_id, hcp_name, hco_name, specialty."
  ],

  sampleTables: [
    {
      tableName: "hcp",
      description: "Healthcare Professional master table",
      columns: ["hcp_id", "name", "email", "phone", "dob"],
      rows: [
        {
          hcp_id: "HCP-101",
          name: "John Smith",
          email: "john@example.com",
          phone: "9876543210",
          dob: "1980-05-10"
        },
        {
          hcp_id: "HCP-102",
          name: "Sarah Jones",
          email: "sarah@example.com",
          phone: "9876543211",
          dob: "1978-03-15"
        }
      ]
    },
    {
      tableName: "hco",
      description: "Healthcare Organization master table",
      columns: ["hco_id", "name", "type"],
      rows: [
        {
          hco_id: "HCO-201",
          name: "City General Hospital",
          type: "Hospital"
        },
        {
          hco_id: "HCO-202",
          name: "Apollo Medical Center",
          type: "Hospital"
        }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: [
        "aff_id",
        "hcp_id",
        "hco_id",
        "primary_flag",
        "start_date",
        "end_date",
        "specialty"
      ],
      rows: [
        {
          aff_id: "AFF-001",
          hcp_id: "HCP-101",
          hco_id: "HCO-201",
          primary_flag: "Y",
          start_date: "2022-01-01",
          end_date: "2024-12-31",
          specialty: "Cardiology"
        },
        {
          aff_id: "AFF-002",
          hcp_id: "HCP-101",
          hco_id: "HCO-202",
          primary_flag: "Y",
          start_date: "2025-01-01",
          end_date: null,
          specialty: "Cardiology"
        },
        {
          aff_id: "AFF-004",
          hcp_id: "HCP-102",
          hco_id: "HCO-201",
          primary_flag: "Y",
          start_date: "2023-03-15",
          end_date: null,
          specialty: "Neurology"
        }
      ]
    }
  ],

  expectedOutputColumns: [
    "hcp_id",
    "hcp_name",
    "hco_name",
    "specialty"
  ],

  expectedOutputSample: [
    {
      hcp_id: "HCP-101",
      hcp_name: "John Smith",
      hco_name: "City General Hospital",
      specialty: "Cardiology"
    },
    {
      hcp_id: "HCP-101",
      hcp_name: "John Smith",
      hco_name: "Apollo Medical Center",
      specialty: "Cardiology"
    },
    {
      hcp_id: "HCP-102",
      hcp_name: "Sarah Jones",
      hco_name: "City General Hospital",
      specialty: "Neurology"
    }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT
    h.hcp_id,
    h.name AS hcp_name,
    o.name AS hco_name,
    a.specialty
FROM hcp h
INNER JOIN affiliations a
    ON h.hcp_id = a.hcp_id
INNER JOIN hco o
    ON a.hco_id = o.hco_id;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Three Table Join",
      description: "Validates that HCP, affiliation, and HCO records are correctly joined.",
      inputDescription: "HCPs with valid affiliations and HCO records",
      expectedOutputSummary: "HCP name, HCO name, and specialty are correctly returned."
    },
    {
      id: "tc-2",
      name: "Multiple Affiliations",
      description: "Validates that an HCP with multiple affiliations produces multiple rows.",
      inputDescription: "HCP-101 has two affiliations",
      expectedOutputSummary: "HCP-101 appears twice with the corresponding HCOs."
    }
  ],

  hints: [
    "Use INNER JOIN between hcp and affiliations.",
    "Join affiliations to hco using hco_id."
  ],

  concept: "SQL Inner Joins Across HCP, Affiliation and HCO Tables",

  evaluation: {
    type: "sql",
    requiredTables: ["hcp", "affiliations", "hco"],
    requiredOperations: ["inner_join"],
    requiredOutputColumns: [
      "hcp_id",
      "hcp_name",
      "hco_name",
      "specialty"
    ],
    structuralChecks: [
      {
        id: "uses_hcp",
        label: "Uses hcp table",
        weight: 15,
        patterns: ["hcp", "FROM hcp"]
      },
      {
        id: "uses_affiliations",
        label: "Uses affiliations table",
        weight: 15,
        patterns: ["affiliations", "JOIN affiliations"]
      },
      {
        id: "uses_hco",
        label: "Uses hco table",
        weight: 15,
        patterns: ["hco", "JOIN hco"]
      },
      {
        id: "joins_hcp_affiliation",
        label: "Joins HCP to affiliations",
        weight: 20,
        patterns: ["h.hcp_id = a.hcp_id", "hcp_id"]
      },
      {
        id: "joins_affiliation_hco",
        label: "Joins affiliations to HCO",
        weight: 20,
        patterns: ["a.hco_id = o.hco_id", "hco_id"]
      }
    ]
  }
},

{
  id: "sql-hcp-2",
  type: "scenario",
  title: "HCPs Without Affiliations",
  domain: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 8,

  scenarioContext:
    "The data stewardship team needs to identify healthcare professionals who currently have no affiliation record in the affiliations table.",

  problemStatement:
    "Write a SQL query to find all HCPs who do not have any affiliation with an HCO.",

  businessRules: [
    "All HCPs must be considered, including HCPs without affiliations.",
    "Use hcp as the driving table.",
    "Return only HCPs for which no matching affiliation exists.",
    "Output columns: hcp_id and name."
  ],

  sampleTables: [
    {
      tableName: "hcp",
      description: "Healthcare Professional master table",
      columns: ["hcp_id", "name", "email", "phone", "dob"],
      rows: [
        {
          hcp_id: "HCP-101",
          name: "John Smith",
          email: "john@example.com",
          phone: "9876543210",
          dob: "1980-05-10"
        },
        {
          hcp_id: "HCP-102",
          name: "Sarah Jones",
          email: "sarah@example.com",
          phone: "9876543211",
          dob: "1978-03-15"
        },
        {
          hcp_id: "HCP-109",
          name: "Lisa Anderson",
          email: "lisa@example.com",
          phone: "9876543218",
          dob: "1983-07-22"
        }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: [
        "aff_id",
        "hcp_id",
        "hco_id",
        "primary_flag",
        "start_date",
        "end_date",
        "specialty"
      ],
      rows: [
        {
          aff_id: "AFF-001",
          hcp_id: "HCP-101",
          hco_id: "HCO-201",
          primary_flag: "Y",
          start_date: "2022-01-01",
          end_date: "2024-12-31",
          specialty: "Cardiology"
        },
        {
          aff_id: "AFF-004",
          hcp_id: "HCP-102",
          hco_id: "HCO-201",
          primary_flag: "Y",
          start_date: "2023-03-15",
          end_date: null,
          specialty: "Neurology"
        }
      ]
    }
  ],

  expectedOutputColumns: ["hcp_id", "name"],

  expectedOutputSample: [
    {
      hcp_id: "HCP-109",
      name: "Lisa Anderson"
    }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT
    h.hcp_id,
    h.name
FROM hcp h
LEFT JOIN affiliations a
    ON h.hcp_id = a.hcp_id
WHERE a.hcp_id IS NULL;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Unassociated HCP Detection",
      description: "Detects HCPs with no affiliation records.",
      inputDescription: "HCP-109 has no affiliation",
      expectedOutputSummary: "HCP-109 is returned."
    },
    {
      id: "tc-2",
      name: "Associated HCP Exclusion",
      description: "Ensures HCPs with affiliations are excluded.",
      inputDescription: "HCP-101 and HCP-102 have affiliations",
      expectedOutputSummary: "HCP-101 and HCP-102 are excluded."
    }
  ],

  hints: [
    "Use LEFT JOIN from hcp to affiliations.",
    "Filter for rows where the affiliation side is NULL."
  ],

  concept: "SQL Left Join and Identification of Unmatched Records",

  evaluation: {
    type: "sql",
    requiredTables: ["hcp", "affiliations"],
    requiredOperations: ["left_join", "null_filter"],
    requiredOutputColumns: ["hcp_id", "name"],
    structuralChecks: [
      {
        id: "uses_left_join",
        label: "Uses LEFT JOIN",
        weight: 30,
        patterns: ["LEFT JOIN", "LEFT OUTER JOIN"]
      },
      {
        id: "checks_null",
        label: "Checks for missing affiliation",
        weight: 30,
        patterns: ["IS NULL", "a.hcp_id IS NULL", "a.aff_id IS NULL"]
      },
      {
        id: "uses_hcp",
        label: "Uses hcp table",
        weight: 20,
        patterns: ["FROM hcp"]
      },
      {
        id: "uses_affiliations",
        label: "Uses affiliations table",
        weight: 20,
        patterns: ["affiliations"]
      }
    ]
  }
},

{
  id: "sql-hcp-3",
  type: "scenario",
  title: "HCP Affiliation Count",
  domain: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 8,

  scenarioContext:
    "The data governance team wants to understand how many HCO affiliations each HCP has, including HCPs who do not have any affiliations.",

  problemStatement:
    "Write a SQL query to return every HCP and the number of affiliations they have. HCPs with no affiliations must also be included with an affiliation count of zero.",

  businessRules: [
    "Include every HCP.",
    "Count affiliation records using aff_id.",
    "HCPs with no affiliations must have an affiliation count of 0.",
    "Output columns: hcp_id, name, affiliation_count."
  ],

  sampleTables: [
    {
      tableName: "hcp",
      description: "Healthcare Professional master table",
      columns: ["hcp_id", "name", "email", "phone", "dob"],
      rows: [
        { hcp_id: "HCP-101", name: "John Smith", email: "john@example.com", phone: "9876543210", dob: "1980-05-10" },
        { hcp_id: "HCP-102", name: "Sarah Jones", email: "sarah@example.com", phone: "9876543211", dob: "1978-03-15" },
        { hcp_id: "HCP-109", name: "Lisa Anderson", email: "lisa@example.com", phone: "9876543218", dob: "1983-07-22" }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-004", hcp_id: "HCP-102", hco_id: "HCO-201", primary_flag: "Y", start_date: "2023-03-15", end_date: null, specialty: "Neurology" }
      ]
    }
  ],

  expectedOutputColumns: [
    "hcp_id",
    "name",
    "affiliation_count"
  ],

  expectedOutputSample: [
    { hcp_id: "HCP-101", name: "John Smith", affiliation_count: 2 },
    { hcp_id: "HCP-102", name: "Sarah Jones", affiliation_count: 1 },
    { hcp_id: "HCP-109", name: "Lisa Anderson", affiliation_count: 0 }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT
    h.hcp_id,
    h.name,
    COUNT(a.aff_id) AS affiliation_count
FROM hcp h
LEFT JOIN affiliations a
    ON h.hcp_id = a.hcp_id
GROUP BY
    h.hcp_id,
    h.name;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Multiple Affiliation Count",
      description: "Validates that HCP-101 has two affiliations.",
      inputDescription: "HCP-101 has AFF-001 and AFF-002",
      expectedOutputSummary: "HCP-101 affiliation_count = 2"
    },
    {
      id: "tc-2",
      name: "Zero Affiliation Preservation",
      description: "Validates that HCP-109 remains in the result.",
      inputDescription: "HCP-109 has no affiliations",
      expectedOutputSummary: "HCP-109 affiliation_count = 0"
    }
  ],

  hints: [
    "Use LEFT JOIN to preserve HCPs with no affiliations.",
    "Use COUNT(a.aff_id), not COUNT(*).",
    "Group by hcp_id and name."
  ],

  concept: "SQL Left Join, Group By and Count",

  evaluation: {
    type: "sql",
    requiredTables: ["hcp", "affiliations"],
    requiredOperations: ["left_join", "group_by", "count"],
    requiredOutputColumns: ["hcp_id", "name", "affiliation_count"],
    structuralChecks: [
      {
        id: "uses_left_join",
        label: "Uses LEFT JOIN",
        weight: 20,
        patterns: ["LEFT JOIN", "LEFT OUTER JOIN"]
      },
      {
        id: "uses_count",
        label: "Counts affiliations",
        weight: 25,
        patterns: ["COUNT(", "COUNT (", "COUNT(a.aff_id)"]
      },
      {
        id: "has_group_by",
        label: "Groups by HCP",
        weight: 25,
        patterns: ["GROUP BY"]
      },
      {
        id: "uses_aff_id",
        label: "Counts affiliation records",
        weight: 20,
        patterns: ["a.aff_id", "COUNT(a.aff_id)"]
      }
    ]
  }
},

{
  id: "sql-hcp-4",
  type: "scenario",
  title: "HCPs With More Than Two Affiliations",
  domain: "SQL",
  difficulty: "Intermediate",
  estimatedMinutes: 10,

  scenarioContext:
    "The data stewardship team wants to identify HCPs who have multiple HCO relationships for additional review.",

  problemStatement:
    "Write a SQL query to find HCPs who have more than two affiliation records. Return the HCP ID, HCP name, and affiliation count.",

  businessRules: [
    "Join hcp with affiliations.",
    "Group records by HCP.",
    "Count affiliation records using aff_id.",
    "Return only HCPs having more than 2 affiliations.",
    "Output columns: hcp_id, name, affiliation_count."
  ],

  sampleTables: [
    {
      tableName: "hcp",
      description: "Healthcare Professional master table",
      columns: ["hcp_id", "name", "email", "phone", "dob"],
      rows: [
        { hcp_id: "HCP-101", name: "John Smith", email: "john@example.com", phone: "9876543210", dob: "1980-05-10" },
        { hcp_id: "HCP-104", name: "Priya Sharma", email: "priya@example.com", phone: "9876543213", dob: "1982-11-02" },
        { hcp_id: "HCP-107", name: "Robert Miller", email: "robert@example.com", phone: "9876543216", dob: "1979-09-12" }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-003", hcp_id: "HCP-101", hco_id: "HCO-203", primary_flag: "N", start_date: "2025-06-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-008", hcp_id: "HCP-104", hco_id: "HCO-203", primary_flag: "Y", start_date: "2024-02-01", end_date: null, specialty: "Pediatrics" },
        { aff_id: "AFF-009", hcp_id: "HCP-104", hco_id: "HCO-204", primary_flag: "N", start_date: "2025-01-15", end_date: null, specialty: "Pediatrics" },
        { aff_id: "AFF-010", hcp_id: "HCP-104", hco_id: "HCO-206", primary_flag: "N", start_date: "2025-07-01", end_date: null, specialty: "Pediatrics" },
        { aff_id: "AFF-014", hcp_id: "HCP-107", hco_id: "HCO-201", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-015", hcp_id: "HCP-107", hco_id: "HCO-202", primary_flag: "N", start_date: "2025-06-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-016", hcp_id: "HCP-107", hco_id: "HCO-205", primary_flag: "N", start_date: "2026-01-01", end_date: null, specialty: "Cardiology" }
      ]
    }
  ],

  expectedOutputColumns: ["hcp_id", "name", "affiliation_count"],

  expectedOutputSample: [
    { hcp_id: "HCP-101", name: "John Smith", affiliation_count: 3 },
    { hcp_id: "HCP-104", name: "Priya Sharma", affiliation_count: 3 },
    { hcp_id: "HCP-107", name: "Robert Miller", affiliation_count: 3 }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT
    h.hcp_id,
    h.name,
    COUNT(a.aff_id) AS affiliation_count
FROM hcp h
INNER JOIN affiliations a
    ON h.hcp_id = a.hcp_id
GROUP BY
    h.hcp_id,
    h.name
HAVING COUNT(a.aff_id) > 2;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Multiple Affiliation Detection",
      description: "Identifies HCPs having more than two affiliation records.",
      inputDescription: "HCP-101, HCP-104 and HCP-107 each have three affiliations",
      expectedOutputSummary: "Three HCPs are returned with affiliation_count = 3."
    },
    {
      id: "tc-2",
      name: "HAVING Filter",
      description: "Ensures HCPs with two or fewer affiliations are excluded.",
      inputDescription: "HCPs with one or two affiliations",
      expectedOutputSummary: "HCPs with <= 2 affiliations are excluded."
    }
  ],

  hints: [
    "Use GROUP BY to calculate affiliation count per HCP.",
    "Use HAVING rather than WHERE to filter the aggregate count."
  ],

  concept: "SQL Group By, Count and Having",

  evaluation: {
    type: "sql",
    requiredTables: ["hcp", "affiliations"],
    requiredOperations: ["inner_join", "group_by", "count", "having"],
    requiredConditions: ["COUNT(a.aff_id) > 2"],
    requiredOutputColumns: ["hcp_id", "name", "affiliation_count"],
    structuralChecks: [
      {
        id: "uses_join",
        label: "Joins HCP to affiliations",
        weight: 20,
        patterns: ["JOIN affiliations", "INNER JOIN affiliations"]
      },
      {
        id: "uses_count",
        label: "Counts affiliations",
        weight: 20,
        patterns: ["COUNT(", "COUNT(a.aff_id)"]
      },
      {
        id: "has_group_by",
        label: "Groups by HCP",
        weight: 20,
        patterns: ["GROUP BY"]
      },
      {
        id: "uses_having",
        label: "Uses HAVING for aggregate filtering",
        weight: 25,
        patterns: ["HAVING COUNT", "HAVING"]
      }
    ]
  }
},

{
  id: "sql-hcp-5",
  type: "scenario",
  title: "Currently Active HCP Affiliations",
  domain: "SQL",
  difficulty: "Intermediate",
  estimatedMinutes: 10,

  scenarioContext:
    "The MDM stewardship team needs to identify currently active HCP-to-HCO relationships. An affiliation is active when its start date has occurred and its end date is either in the future or not populated.",

  problemStatement:
    "Write a SQL query to return all currently active affiliations.",

  businessRules: [
    "start_date must be less than or equal to the current date.",
    "end_date must be NULL or greater than or equal to the current date.",
    "Return the complete affiliation record.",
    "Do not return historical affiliations that have already ended."
  ],

  sampleTables: [
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-007", hcp_id: "HCP-103", hco_id: "HCO-205", primary_flag: "Y", start_date: "2023-06-01", end_date: null, specialty: "Oncology" },
        { aff_id: "AFF-011", hcp_id: "HCP-105", hco_id: "HCO-201", primary_flag: "Y", start_date: "2020-01-01", end_date: "2022-12-31", specialty: "Orthopedics" },
        { aff_id: "AFF-013", hcp_id: "HCP-106", hco_id: "HCO-202", primary_flag: "Y", start_date: "2026-01-01", end_date: null, specialty: "Dermatology" }
      ]
    }
  ],

  expectedOutputColumns: [
    "aff_id",
    "hcp_id",
    "hco_id",
    "primary_flag",
    "start_date",
    "end_date",
    "specialty"
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT *
FROM affiliations
WHERE start_date <= CURRENT_DATE
  AND (
      end_date IS NULL
      OR end_date >= CURRENT_DATE
  );
`,

  testCases: [
    {
      id: "tc-1",
      name: "Active Open-Ended Affiliation",
      description: "Includes affiliations with NULL end_date that have already started.",
      inputDescription: "AFF-002 and AFF-007",
      expectedOutputSummary: "Open-ended active affiliations are included."
    },
    {
      id: "tc-2",
      name: "Historical Affiliation Exclusion",
      description: "Excludes affiliations whose end_date is before the current date.",
      inputDescription: "AFF-001 and AFF-011",
      expectedOutputSummary: "Historical affiliations are excluded."
    }
  ],

  hints: [
    "Use CURRENT_DATE.",
    "Handle NULL end_date explicitly.",
    "Use AND between the start-date and end-date conditions."
  ],

  concept: "SQL Date Filtering and NULL Handling",

  evaluation: {
    type: "sql",
    requiredTables: ["affiliations"],
    requiredOperations: ["date_filter", "null_handling"],
    requiredConditions: [
      "start_date <= CURRENT_DATE",
      "end_date IS NULL",
      "end_date >= CURRENT_DATE"
    ],
    structuralChecks: [
      {
        id: "uses_start_date",
        label: "Checks start date",
        weight: 25,
        patterns: ["start_date <= CURRENT_DATE", "start_date"]
      },
      {
        id: "handles_null_end_date",
        label: "Handles NULL end date",
        weight: 25,
        patterns: ["end_date IS NULL"]
      },
      {
        id: "checks_end_date",
        label: "Checks end date",
        weight: 25,
        patterns: ["end_date >= CURRENT_DATE"]
      },
      {
        id: "uses_current_date",
        label: "Uses current date",
        weight: 15,
        patterns: ["CURRENT_DATE", "CURRENT_DATE()"]
      }
    ]
  }
},

{
  id: "sql-hcp-6",
  type: "scenario",
  title: "HCO With Highest Number of HCPs",
  domain: "SQL",
  difficulty: "Intermediate",
  estimatedMinutes: 10,

  scenarioContext:
    "The MDM analytics team wants to identify the healthcare organization with the largest number of distinct affiliated HCPs.",

  problemStatement:
    "Write a SQL query to find the HCO with the highest number of distinct affiliated HCPs. Return the HCO ID, HCO name, and HCP count.",

  businessRules: [
    "Join hco to affiliations using hco_id.",
    "Count distinct HCPs for each HCO.",
    "Group by HCO ID and HCO name.",
    "Return the HCO with the highest HCP count.",
    "Output columns: hco_id, name, hcp_count."
  ],

  sampleTables: [
    {
      tableName: "hco",
      description: "Healthcare Organization master table",
      columns: ["hco_id", "name", "type"],
      rows: [
        { hco_id: "HCO-201", name: "City General Hospital", type: "Hospital" },
        { hco_id: "HCO-202", name: "Apollo Medical Center", type: "Hospital" },
        { hco_id: "HCO-203", name: "CarePlus Clinic", type: "Clinic" },
        { hco_id: "HCO-204", name: "MedLife Specialty Center", type: "Specialty Center" },
        { hco_id: "HCO-205", name: "Sunrise Hospital", type: "Hospital" },
        { hco_id: "HCO-206", name: "HealthFirst Clinic", type: "Clinic" }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-004", hcp_id: "HCP-102", hco_id: "HCO-201", primary_flag: "Y", start_date: "2023-03-15", end_date: null, specialty: "Neurology" },
        { aff_id: "AFF-011", hcp_id: "HCP-105", hco_id: "HCO-201", primary_flag: "Y", start_date: "2020-01-01", end_date: "2022-12-31", specialty: "Orthopedics" },
        { aff_id: "AFF-014", hcp_id: "HCP-107", hco_id: "HCO-201", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-006", hcp_id: "HCP-103", hco_id: "HCO-202", primary_flag: "Y", start_date: "2021-06-01", end_date: "2023-05-31", specialty: "Oncology" },
        { aff_id: "AFF-013", hcp_id: "HCP-106", hco_id: "HCO-202", primary_flag: "Y", start_date: "2026-01-01", end_date: null, specialty: "Dermatology" }
      ]
    }
  ],

  expectedOutputColumns: ["hco_id", "name", "hcp_count"],

  expectedOutputSample: [
    {
      hco_id: "HCO-201",
      name: "City General Hospital",
      hcp_count: 4
    }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
SELECT
    o.hco_id,
    o.name,
    COUNT(DISTINCT a.hcp_id) AS hcp_count
FROM hco o
INNER JOIN affiliations a
    ON o.hco_id = a.hco_id
GROUP BY
    o.hco_id,
    o.name
ORDER BY hcp_count DESC
LIMIT 1;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Distinct HCP Counting",
      description: "Validates that HCPs are counted distinctly for each HCO.",
      inputDescription: "HCO-201 has four distinct HCPs",
      expectedOutputSummary: "HCO-201 has hcp_count = 4."
    },
    {
      id: "tc-2",
      name: "Maximum HCO Selection",
      description: "Validates that the HCO with the highest count is selected.",
      inputDescription: "Multiple HCOs with different HCP counts",
      expectedOutputSummary: "The HCO with the highest count is returned."
    }
  ],

  hints: [
    "Use COUNT(DISTINCT hcp_id).",
    "Group by HCO.",
    "Sort descending by HCP count and select the first row."
  ],

  concept: "SQL Aggregation, Distinct Counting and Top-N Selection",

  evaluation: {
    type: "sql",
    requiredTables: ["hco", "affiliations"],
    requiredOperations: ["inner_join", "group_by", "count_distinct", "order_by"],
    requiredOutputColumns: ["hco_id", "name", "hcp_count"],
    structuralChecks: [
      {
        id: "uses_hco",
        label: "Uses hco table",
        weight: 15,
        patterns: ["FROM hco"]
      },
      {
        id: "uses_affiliations",
        label: "Uses affiliations",
        weight: 15,
        patterns: ["affiliations", "JOIN affiliations"]
      },
      {
        id: "uses_distinct_count",
        label: "Counts distinct HCPs",
        weight: 25,
        patterns: ["COUNT(DISTINCT", "COUNT (DISTINCT"]
      },
      {
        id: "has_group_by",
        label: "Groups by HCO",
        weight: 20,
        patterns: ["GROUP BY"]
      },
      {
        id: "gets_maximum",
        label: "Selects highest count",
        weight: 20,
        patterns: ["ORDER BY", "DESC", "LIMIT 1"]
      }
    ]
  }
},

{
  id: "sql-hcp-7",
  type: "scenario",
  title: "Latest Affiliation for Each HCP",
  domain: "SQL",
  difficulty: "Advanced",
  estimatedMinutes: 12,

  scenarioContext:
    "HCPs can have multiple historical and current affiliations. The stewardship team needs one latest affiliation record for every HCP based on the affiliation start date.",

  problemStatement:
    "Write a SQL query to return the latest affiliation for each HCP based on start_date. Return the complete affiliation record. If multiple affiliations have the same start_date, select the record with the highest aff_id.",

  businessRules: [
    "Partition affiliation records by hcp_id.",
    "Order records by start_date descending.",
    "Use aff_id descending as the tie-breaker.",
    "Return exactly one affiliation record per HCP.",
    "Return the complete affiliation record."
  ],

  sampleTables: [
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation history",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-003", hcp_id: "HCP-101", hco_id: "HCO-203", primary_flag: "N", start_date: "2025-06-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-017", hcp_id: "HCP-108", hco_id: "HCO-203", primary_flag: "Y", start_date: "2026-01-01", end_date: null, specialty: "Gastroenterology" },
        { aff_id: "AFF-018", hcp_id: "HCP-108", hco_id: "HCO-204", primary_flag: "N", start_date: "2026-01-01", end_date: null, specialty: "Gastroenterology" }
      ]
    }
  ],

  expectedOutputColumns: [
    "aff_id",
    "hcp_id",
    "hco_id",
    "primary_flag",
    "start_date",
    "end_date",
    "specialty"
  ],

  expectedOutputSample: [
    {
      aff_id: "AFF-003",
      hcp_id: "HCP-101",
      hco_id: "HCO-203",
      primary_flag: "N",
      start_date: "2025-06-01",
      end_date: null,
      specialty: "Cardiology"
    },
    {
      aff_id: "AFF-018",
      hcp_id: "HCP-108",
      hco_id: "HCO-204",
      primary_flag: "N",
      start_date: "2026-01-01",
      end_date: null,
      specialty: "Gastroenterology"
    }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
WITH ranked AS (
    SELECT
        a.*,
        ROW_NUMBER() OVER (
            PARTITION BY hcp_id
            ORDER BY start_date DESC, aff_id DESC
        ) AS rn
    FROM affiliations a
)
SELECT
    aff_id,
    hcp_id,
    hco_id,
    primary_flag,
    start_date,
    end_date,
    specialty
FROM ranked
WHERE rn = 1;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Latest Affiliation Selection",
      description: "Selects the most recent affiliation based on start_date for each HCP.",
      inputDescription: "HCP-101 has affiliations starting in 2022, 2025-01 and 2025-06",
      expectedOutputSummary: "AFF-003 is selected for HCP-101."
    },
    {
      id: "tc-2",
      name: "Tie Breaking",
      description: "When two affiliations have the same start_date, selects the higher aff_id.",
      inputDescription: "HCP-108 has AFF-017 and AFF-018 with the same start_date",
      expectedOutputSummary: "AFF-018 is selected."
    },
    {
      id: "tc-3",
      name: "One Record Per HCP",
      description: "Validates that exactly one affiliation is returned for each HCP.",
      inputDescription: "Multiple affiliations per HCP",
      expectedOutputSummary: "Only one record per HCP is returned."
    }
  ],

  hints: [
    "Use ROW_NUMBER().",
    "Partition by hcp_id.",
    "Order by start_date DESC and aff_id DESC.",
    "Filter the result to row number 1."
  ],

  concept: "SQL Window Functions, ROW_NUMBER and Latest-Record Selection",

  evaluation: {
    type: "sql",
    requiredTables: ["affiliations"],
    requiredOperations: ["window_function", "row_number", "partition_by", "order_by"],
    requiredConditions: ["rn = 1"],
    requiredOutputColumns: [
      "aff_id",
      "hcp_id",
      "hco_id",
      "primary_flag",
      "start_date",
      "end_date",
      "specialty"
    ],
    structuralChecks: [
      {
        id: "uses_row_number",
        label: "Uses ROW_NUMBER",
        weight: 25,
        patterns: ["ROW_NUMBER()", "ROW_NUMBER ()"]
      },
      {
        id: "partitions_by_hcp",
        label: "Partitions by HCP",
        weight: 20,
        patterns: ["PARTITION BY hcp_id"]
      },
      {
        id: "orders_latest",
        label: "Orders latest affiliation first",
        weight: 15,
        patterns: ["start_date DESC"]
      },
      {
        id: "tie_breaker",
        label: "Uses aff_id as tie-breaker",
        weight: 15,
        patterns: ["aff_id DESC"]
      },
      {
        id: "filters_first_row",
        label: "Keeps latest row",
        weight: 15,
        patterns: ["WHERE rn = 1", "WHERE rank_num = 1"]
      }
    ]
  }
},

{
  id: "sql-hcp-8",
  type: "scenario",
  title: "Latest Active Affiliation for Each HCP",
  domain: "SQL",
  difficulty: "Advanced",
  estimatedMinutes: 15,

  scenarioContext:
    "The MDM stewardship team needs the current active HCO relationship for every HCP. An active affiliation is one that has started and has not yet ended. HCPs without an active affiliation must still appear in the result.",

  problemStatement:
    "Write a SQL query to return every HCP and their latest active affiliation. If an HCP has multiple active affiliations, select the one with the latest start_date. If multiple active affiliations have the same start_date, select the highest aff_id. HCPs with no active affiliation must still be returned with NULL affiliation and HCO information.",

  businessRules: [
    "An active affiliation has start_date <= CURRENT_DATE.",
    "An active affiliation has end_date IS NULL or end_date >= CURRENT_DATE.",
    "Filter to active affiliations before applying the ranking logic.",
    "Partition active affiliations by hcp_id.",
    "Order by start_date DESC and aff_id DESC.",
    "Select row number 1 for each HCP.",
    "Use a LEFT JOIN from hcp so HCPs without active affiliations are preserved.",
    "Output HCP information and latest active affiliation information."
  ],

  sampleTables: [
    {
      tableName: "hcp",
      description: "Healthcare Professional master table",
      columns: ["hcp_id", "name", "email", "phone", "dob"],
      rows: [
        { hcp_id: "HCP-101", name: "John Smith", email: "john@example.com", phone: "9876543210", dob: "1980-05-10" },
        { hcp_id: "HCP-102", name: "Sarah Jones", email: "sarah@example.com", phone: "9876543211", dob: "1978-03-15" },
        { hcp_id: "HCP-105", name: "David Wilson", email: "david@example.com", phone: "9876543214", dob: "1975-01-25" },
        { hcp_id: "HCP-108", name: "Anita Patel", email: "anita@example.com", phone: "9876543217", dob: "1988-04-30" },
        { hcp_id: "HCP-109", name: "Lisa Anderson", email: "lisa@example.com", phone: "9876543218", dob: "1983-07-22" }
      ]
    },
    {
      tableName: "hco",
      description: "Healthcare Organization master table",
      columns: ["hco_id", "name", "type"],
      rows: [
        { hco_id: "HCO-201", name: "City General Hospital", type: "Hospital" },
        { hco_id: "HCO-202", name: "Apollo Medical Center", type: "Hospital" },
        { hco_id: "HCO-203", name: "CarePlus Clinic", type: "Clinic" },
        { hco_id: "HCO-204", name: "MedLife Specialty Center", type: "Specialty Center" }
      ]
    },
    {
      tableName: "affiliations",
      description: "HCP to HCO affiliation table",
      columns: ["aff_id", "hcp_id", "hco_id", "primary_flag", "start_date", "end_date", "specialty"],
      rows: [
        { aff_id: "AFF-001", hcp_id: "HCP-101", hco_id: "HCO-201", primary_flag: "Y", start_date: "2022-01-01", end_date: "2024-12-31", specialty: "Cardiology" },
        { aff_id: "AFF-002", hcp_id: "HCP-101", hco_id: "HCO-202", primary_flag: "Y", start_date: "2025-01-01", end_date: null, specialty: "Cardiology" },
        { aff_id: "AFF-004", hcp_id: "HCP-102", hco_id: "HCO-201", primary_flag: "Y", start_date: "2023-03-15", end_date: null, specialty: "Neurology" },
        { aff_id: "AFF-011", hcp_id: "HCP-105", hco_id: "HCO-201", primary_flag: "Y", start_date: "2020-01-01", end_date: "2022-12-31", specialty: "Orthopedics" },
        { aff_id: "AFF-012", hcp_id: "HCP-105", hco_id: "HCO-205", primary_flag: "Y", start_date: "2023-01-01", end_date: "2024-12-31", specialty: "Orthopedics" },
        { aff_id: "AFF-017", hcp_id: "HCP-108", hco_id: "HCO-203", primary_flag: "Y", start_date: "2026-01-01", end_date: null, specialty: "Gastroenterology" },
        { aff_id: "AFF-018", hcp_id: "HCP-108", hco_id: "HCO-204", primary_flag: "N", start_date: "2026-01-01", end_date: null, specialty: "Gastroenterology" }
      ]
    }
  ],

  expectedOutputColumns: [
    "hcp_id",
    "hcp_name",
    "aff_id",
    "hco_id",
    "hco_name",
    "start_date",
    "end_date",
    "specialty"
  ],

  expectedOutputSample: [
    {
      hcp_id: "HCP-101",
      hcp_name: "John Smith",
      aff_id: "AFF-002",
      hco_id: "HCO-202",
      hco_name: "Apollo Medical Center",
      start_date: "2025-01-01",
      end_date: null,
      specialty: "Cardiology"
    },
    {
      hcp_id: "HCP-102",
      hcp_name: "Sarah Jones",
      aff_id: "AFF-004",
      hco_id: "HCO-201",
      hco_name: "City General Hospital",
      start_date: "2023-03-15",
      end_date: null,
      specialty: "Neurology"
    },
    {
      hcp_id: "HCP-105",
      hcp_name: "David Wilson",
      aff_id: null,
      hco_id: null,
      hco_name: null,
      start_date: null,
      end_date: null,
      specialty: null
    },
    {
      hcp_id: "HCP-108",
      hcp_name: "Anita Patel",
      aff_id: "AFF-018",
      hco_id: "HCO-204",
      hco_name: "MedLife Specialty Center",
      start_date: "2026-01-01",
      end_date: null,
      specialty: "Gastroenterology"
    },
    {
      hcp_id: "HCP-109",
      hcp_name: "Lisa Anderson",
      aff_id: null,
      hco_id: null,
      hco_name: null,
      start_date: null,
      end_date: null,
      specialty: null
    }
  ],

  language: "sql",
  starterCode: "",

  solutionReference: `
WITH active_affiliations AS (
    SELECT *
    FROM affiliations
    WHERE start_date <= CURRENT_DATE
      AND (
          end_date IS NULL
          OR end_date >= CURRENT_DATE
      )
),
ranked AS (
    SELECT
        a.*,
        ROW_NUMBER() OVER (
            PARTITION BY hcp_id
            ORDER BY start_date DESC, aff_id DESC
        ) AS rn
    FROM active_affiliations a
)
SELECT
    h.hcp_id,
    h.name AS hcp_name,
    r.aff_id,
    r.hco_id,
    o.name AS hco_name,
    r.start_date,
    r.end_date,
    r.specialty
FROM hcp h
LEFT JOIN ranked r
    ON h.hcp_id = r.hcp_id
   AND r.rn = 1
LEFT JOIN hco o
    ON r.hco_id = o.hco_id;
`,

  testCases: [
    {
      id: "tc-1",
      name: "Latest Active Affiliation",
      description: "Selects the latest currently active affiliation for an HCP.",
      inputDescription: "HCP-101 has one historical and one active affiliation",
      expectedOutputSummary: "AFF-002 is selected for HCP-101."
    },
    {
      id: "tc-2",
      name: "Historical Affiliation Exclusion",
      description: "Ensures ended affiliations are not considered when finding the latest active affiliation.",
      inputDescription: "HCP-105 has only ended affiliations",
      expectedOutputSummary: "HCP-105 is returned with NULL affiliation values."
    },
    {
      id: "tc-3",
      name: "Tie Breaking",
      description: "When active affiliations have the same start_date, selects the highest aff_id.",
      inputDescription: "HCP-108 has AFF-017 and AFF-018 with the same start_date",
      expectedOutputSummary: "AFF-018 is selected."
    },
    {
      id: "tc-4",
      name: "HCP Without Affiliation",
      description: "Ensures an HCP with no affiliation is preserved.",
      inputDescription: "HCP-109 has no affiliation records",
      expectedOutputSummary: "HCP-109 is returned with NULL affiliation and HCO values."
    }
  ],

  hints: [
    "First filter affiliations to only active records.",
    "Use ROW_NUMBER() partitioned by hcp_id.",
    "Order by start_date DESC and aff_id DESC.",
    "Use LEFT JOIN from hcp to preserve HCPs without active affiliations.",
    "Be careful not to put the active-affiliation filter in the final WHERE clause after the LEFT JOIN."
  ],

  concept: "SQL Window Functions, Temporal Filtering, Left Joins and Latest-Record Selection",

  evaluation: {
    type: "sql",
    requiredTables: ["hcp", "affiliations", "hco"],
    requiredOperations: [
      "left_join",
      "window_function",
      "row_number",
      "partition_by",
      "date_filter"
    ],
    requiredConditions: [
      "start_date <= CURRENT_DATE",
      "end_date IS NULL",
      "end_date >= CURRENT_DATE",
      "rn = 1"
    ],
    requiredOutputColumns: [
      "hcp_id",
      "hcp_name",
      "aff_id",
      "hco_id",
      "hco_name",
      "start_date",
      "end_date",
      "specialty"
    ],
    structuralChecks: [
      {
        id: "uses_hcp",
        label: "Uses HCP master table",
        weight: 10,
        patterns: ["FROM hcp", "JOIN hcp"]
      },
      {
        id: "uses_affiliations",
        label: "Uses affiliations",
        weight: 10,
        patterns: ["affiliations"]
      },
      {
        id: "uses_hco",
        label: "Uses HCO table",
        weight: 10,
        patterns: ["hco", "JOIN hco"]
      },
      {
        id: "uses_left_join",
        label: "Uses LEFT JOIN from HCP",
        weight: 15,
        patterns: ["LEFT JOIN"]
      },
      {
        id: "filters_active_records",
        label: "Filters active affiliations",
        weight: 15,
        patterns: [
          "start_date <= CURRENT_DATE",
          "end_date IS NULL",
          "end_date >= CURRENT_DATE"
        ]
      },
      {
        id: "uses_row_number",
        label: "Uses ROW_NUMBER",
        weight: 15,
        patterns: ["ROW_NUMBER()"]
      },
      {
        id: "partitions_by_hcp",
        label: "Partitions by HCP",
        weight: 10,
        patterns: ["PARTITION BY hcp_id"]
      },
      {
        id: "uses_tie_breaker",
        label: "Uses aff_id as tie-breaker",
        weight: 5,
        patterns: ["aff_id DESC"]
      }
    ]
  }
  },

{
  id: "sql-mcq-1",
  type: "sql-mcq",
  title: "INNER JOIN Concept",
  topic: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 2,
  questionText:
    "What does an INNER JOIN between the hcp and affiliations tables return?",
  options: [
    { id: "opt-a", label: "A", text: "All HCPs, including HCPs without affiliations." },
    { id: "opt-b", label: "B", text: "Only HCPs that have a matching affiliation." },
    { id: "opt-c", label: "C", text: "All affiliations, including affiliations without a matching HCP." },
    { id: "opt-d", label: "D", text: "Only HCPs whose primary_flag is 'Y'." },
  ],
  correctOptionId: "opt-b",
  explanation:
    "An INNER JOIN returns only rows where a matching record exists in both joined tables.",
  concept: "SQL INNER JOIN",
},

{
  id: "sql-mcq-2",
  type: "sql-mcq",
  title: "WHERE Clause",
  topic: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 2,
  questionText:
    "Which SQL clause is normally used to filter rows before GROUP BY is performed?",
  options: [
    { id: "opt-a", label: "A", text: "HAVING" },
    { id: "opt-b", label: "B", text: "ORDER BY" },
    { id: "opt-c", label: "C", text: "WHERE" },
    { id: "opt-d", label: "D", text: "GROUP BY" },
  ],
  correctOptionId: "opt-c",
  explanation:
    "WHERE filters individual rows before grouping and aggregation are performed.",
  concept: "SQL WHERE Clause",
},

{
  id: "sql-mcq-3",
  type: "sql-mcq",
  title: "COUNT and NULL Values",
  topic: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 2,
  questionText:
    "Given an affiliations table where aff_id contains three non-NULL values and one NULL value, what will SELECT COUNT(aff_id) return?",
  options: [
    { id: "opt-a", label: "A", text: "4" },
    { id: "opt-b", label: "B", text: "3" },
    { id: "opt-c", label: "C", text: "1" },
    { id: "opt-d", label: "D", text: "NULL" },
  ],
  correctOptionId: "opt-b",
  explanation:
    "COUNT(column_name) counts only non-NULL values in that column.",
  concept: "SQL COUNT and NULL Handling",
},

{
  id: "sql-mcq-4",
  type: "sql-mcq",
  title: "GROUP BY with COUNT",
  topic: "SQL",
  difficulty: "Basic",
  estimatedMinutes: 3,
  questionText:
    "Which query correctly returns the number of affiliations for each HCP?",
  options: [
    { id: "opt-a", label: "A", text: `SELECT hcp_id, COUNT(*)
     FROM affiliations;`,
    },
    { id: "opt-b", label: "B", text: `SELECT hcp_id, COUNT(*)
     FROM affiliations
     GROUP BY hcp_id;` },
    { id: "opt-c", label: "C", text: `SELECT COUNT(hcp_id)
     FROM affiliations
     GROUP BY aff_id;` },
    { id: "opt-d", label: "D", text: `SELECT hcp_id, COUNT(*)
     FROM affiliations
     ORDER BY hcp_id;` },
  ],
  correctOptionId: "opt-b",
  explanation:
    "When an aggregate function is used with a non-aggregated column, the non-aggregated column must be included in GROUP BY.",
  concept: "SQL GROUP BY and Aggregate Functions",
}

  // -------------------------------------------------------------
];
