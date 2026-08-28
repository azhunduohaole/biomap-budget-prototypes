# Member Budget Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement member-level first-round budget activation and valid all-zero personal budgets across the tenant and personal prototypes.

**Architecture:** Add a member budget lifecycle independent from tenant policy state. Keep per-member draft values for both currencies, reserve both values at confirmation, complete that member asynchronously, and derive the tenant aggregate state from active-member completion.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, BioMap CSS design tokens

## Global Constraints

- Account status and member budget status are independent fields.
- Zero is a configured value; missing is unconfigured.
- Disabled members are excluded from tenant configuration completion.
- Only the member in `ENABLING` is blocked from new paid tasks.
- Credits and CRO are validated and committed atomically for each member.
- Use existing BioMap semantic tokens for all new UI states.

---

### Task 1: Member Budget Lifecycle Domain

**Files:**
- Modify: `src/types/budget.ts`
- Modify: `src/utils/budget.ts`
- Modify: `src/utils/budget.test.ts`

**Interfaces:**
- Produces: `MemberBudgetStatus`, `MemberBudgetDraft`, `confirmMemberBudget()`, and `completeMemberBudgetActivation()`.

- [ ] Write failing tests for zero-value drafts, per-member pending commitments, hard-pool validation, success, and failure release.
- [ ] Run `npm run test:run -- src/utils/budget.test.ts` and verify the new tests fail for missing APIs.
- [ ] Implement the smallest domain changes that satisfy the tests.
- [ ] Re-run the domain tests and verify they pass.

### Task 2: Tenant Member-Level Configuration UI

**Files:**
- Modify: `src/features/budget/BudgetManagementPage.tsx`
- Modify: `src/features/budget/MemberBudgetTable.tsx`
- Modify: `src/features/budget/BudgetPolicyControl.tsx`
- Create: `src/features/budget/MemberBudgetConfigurationDialog.tsx`
- Modify: `src/features/budget/BudgetManagementPage.test.tsx`
- Modify: `src/styles/budget.css`

**Interfaces:**
- Consumes: member lifecycle functions from Task 1.
- Produces: two-currency member configuration and member-level activation progress.

- [ ] Write failing interaction tests for one-member activation, no tenant-wide blocking, zero-budget activation, automatic aggregate enablement, and retry messaging.
- [ ] Run the focused component test and verify expected failures.
- [ ] Replace first-round allocation dialog and tenant-wide confirm with per-member configuration and confirmation.
- [ ] Add token-based state labels and responsive presentation.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Personal Member-State Experience

**Files:**
- Modify: `src/types/personalExpense.ts`
- Modify: `src/features/personal-expense/PersonalExpensePage.tsx`
- Modify: `src/features/personal-expense/PersonalExpensePage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: URL review state `memberBudgetStatus`.
- Produces: member-specific transitioning, unconfigured tenant-billing, and enabled zero-budget views.

- [ ] Write failing tests for member `ENABLING`, another member remaining usable, and enabled zero values.
- [ ] Run the focused personal-page test and verify expected failures.
- [ ] Implement member-state routing and presentation.
- [ ] Re-run the focused test and verify it passes.

### Task 4: PRD Alignment And Final Verification

**Files:**
- Update: new Feishu PRD `ZxdZdPZ69oDXYlxva54cxc92nRY`

**Interfaces:**
- Documents the implemented state model, accounting invariant, UI matrix, interfaces, errors, logs, and acceptance criteria.

- [ ] Update only the new PRD; do not write to the original PRD.
- [ ] Remove tenant-wide first-round atomic-enable language and add member-level activation rules.
- [ ] Add explicit-zero semantics and acceptance checks.
- [ ] Run full `npm run test:run`, `npm run build`, and `git diff --check`.
- [ ] Fetch the updated PRD and verify required terms with no contradictory old rules.
