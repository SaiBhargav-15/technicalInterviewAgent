import test from "node:test";
import assert from "node:assert/strict";

import { isAllowedRecruiterEmail } from "./recruiterAccess";

test("allows only exact allowlisted Chryselys addresses, ignoring case and whitespace", () => {
  assert.equal(isAllowedRecruiterEmail("  RECRUITER@CHRYSELYS.COM ", ["recruiter@chryselys.com"]), true);
  assert.equal(isAllowedRecruiterEmail("other@chryselys.com", ["recruiter@chryselys.com"]), false);
  assert.equal(isAllowedRecruiterEmail("recruiter@example.com", ["recruiter@example.com"]), false);
  assert.equal(isAllowedRecruiterEmail("recruiter@chryselys.com.attacker.test", ["recruiter@chryselys.com.attacker.test"]), false);
});