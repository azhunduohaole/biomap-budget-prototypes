# Member Budget Activation Design

## Goal

Change first-round personal-budget activation from an all-tenant cutover to member-level activation, and allow every active member to be explicitly enabled with zero Credits and zero CRO budget.

## State Model

- Tenant policy keeps `DISABLED`, `CONFIGURING`, `ENABLED`, and `DISABLING`. `ENABLING` remains a supported legacy/read-only aggregate state, but the normal first-round flow no longer places the whole tenant in it.
- Each member has a separate `budgetStatus`: `UNCONFIGURED`, `ENABLING`, `ENABLED`, or `ENABLE_FAILED`.
- Account status remains separate: `active` or `disabled`.
- In `CONFIGURING`, confirming one active member changes only that member to `ENABLING`. That member cannot submit a new paid task until activation succeeds.
- Members that are still `UNCONFIGURED` continue using tenant-level billing, limited to the tenant's currently uncommitted funds.
- After the last active member becomes `ENABLED`, the tenant policy becomes `ENABLED` automatically.

## Zero Budget

- An explicit value of zero is a valid configured budget and differs from an omitted value.
- Confirmation always submits both currencies for one member, including zeros.
- All active members may be enabled with zero in both currencies.
- An enabled zero-budget member sees personal available `0`, current executable `0`, and the reason `PERSONAL_BUDGET_INSUFFICIENT`; there is no fallback to tenant-level billing.
- Disabled members do not participate in configuration completion.

## Accounting And Concurrency

- Member confirmation validates both currencies against the latest hard-allocation pool.
- On confirmation, the requested member commitment is reserved atomically before the member enters `ENABLING`.
- Hard-pool invariant during mixed mode: `enabled unused commitments + enabling pending commitments <= tenant payable` for each currency.
- Activation success converts the pending commitment into the member's formal budget and writes allocation ledger records only for positive amounts.
- Zero-budget confirmation writes an operation audit event but no amount-changing ledger record.
- Activation failure releases the pending commitment and changes the member to `ENABLE_FAILED`, where an administrator can retry.

## Interface Behavior

- Tenant member table adds a budget-status column and a per-row `Configure`, `Confirm and enable`, `Retry`, or read-only `Enabling` action.
- The configuration dialog captures Credits and CRO together, permits zero, and explains that only the selected member is temporarily blocked.
- The tenant policy panel shows configured, enabling, and pending active-member counts. It no longer has a tenant-wide `Confirm enable` button.
- Personal expense UI resolves member budget status separately from tenant policy. `ENABLING` shows a member-specific transition notice; `ENABLED` shows budget cards even when both values are zero.
- Existing history remains visible in every state.

## Acceptance

- Confirming one member never blocks another member or marks another member enabled.
- A member cannot start a paid task while their budget status is `ENABLING`.
- A member can start only after reaching `ENABLED` and passing personal and tenant funding checks.
- All active members can be confirmed with zero for both currencies, and the tenant then reaches `ENABLED`.
- Zero and unconfigured remain distinguishable in API data, UI, logs, and tests.

