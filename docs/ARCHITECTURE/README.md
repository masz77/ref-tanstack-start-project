# How to write an architecture doc

This folder (`docs/ARCHITECT/`) is the **single source of truth** for *why* the codebase is shaped the way it is — the decisions, key files, data flows, and security boundaries behind each feature. Code says *what*; these docs say *why*, and they are the first thing a human or LLM should read before changing a feature.

This README is the spec for the docs themselves: the layout to follow, the conventions, and the workflow. **Read it before creating or editing any doc in this folder.** The authoritative workflow rule lives in [`.claude/rules/decision-docs.md`](../../../_shared/.claude/rules/decision-docs.md); this README is its concrete, repo-specific expansion.

---

## When to create a doc

Create or update a doc **before** writing code, for:

- A **new feature** → create `docs/ARCHITECT/{feature-name}.md`, commit it **separately** before any code.
- A **big refactor** → update (or create) the doc — what's changing, why, migration path, affected files — commit before starting.
- A **feature flag** or any non-obvious decision (a security boundary, a provider choice, a data-flow direction).

For an **existing** feature: read the doc first. If your change *extends* it, update the doc (commit separately). If your change *contradicts* a documented decision → **STOP and ask the user** (see [STOP rules](#stop-rules)).

Do **not** create a doc for a one-line fix, a typo, or anything fully captured by the code + commit message.

---

## The canonical layout

Every **decision doc** has these five core sections, **in this order**:

```markdown
# Feature Name

## Overview
One paragraph: what this feature is and the single most important thing to know.

## Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| ...      | ...    | ...       |

## Key Files
| File | Purpose |
|------|---------|
| ...  | ...     |

## Data Flow
How data/control moves through the system — prose, an ASCII/code-fenced diagram,
or a numbered sequence. Reference real symbols and paths.

## Security Considerations
Auth boundaries, encryption, tenant isolation, what's validated where, what is
deliberately public. State "none" explicitly if truly not applicable.
```

The five core sections are **required and ordered**. You may insert **extra sections** wherever they read best (see below). Minimal clean example: [`centralized-toast.md`](./centralized-toast.md). Thorough example with many extras: [`shared-types.md`](./shared-types.md).

### Section guidance

- **Overview** — one paragraph. Lead with the load-bearing fact. Link to the full design spec if one exists (`docs/superpowers/specs/...`).
- **Architecture Decisions** — always a 3-column table `| Decision | Choice | Rationale |`. One row per real decision. The *rationale* is the point — capture the trade-off a future reader would otherwise re-litigate.
- **Key Files** — always a 2-column table `| File | Purpose |`. Repo-relative paths; symbol names where useful. This is the map from "the doc" to "the code."
- **Data Flow** — show the actual path (e.g. `Authorize → mintOauthState → Pipedrive → callback → installFromCallback`). Numbered steps or a fenced diagram both work.
- **Security Considerations** — bullet list. Each bullet names the mechanism and *where* it lives.

### Allowed / common extra sections

Add these only when they carry weight. Observed across this folder:

- `AS-BUILT correction vs the original spec` — when the shipped reality diverged from the design spec.
- `STOP Rules` — changes that contradict this doc and require user approval (great for substrate/security docs).
- `Gaps — "not wired"` — a table of known-incomplete pieces (mark SHIPPED rows with ~~strikethrough~~ + ✅ as they land).
- `Out of Scope` / `Non-goals` / `Follow-ups`.
- `Operational note` — runbook-style guidance (e.g. a manual DB op).
- `Open Questions (non-blocking)`, `Critical Findings`, `Verification Commands`.

Keep the five core sections present and in order regardless of how many extras you add.

---

## DRY (STRICT): one home per fact

**This is enforced strictly.** A fact, decision, data-flow, or explanation lives in **exactly one** doc — its *owner*. Every other doc that needs it **links to the owning heading and restates nothing**.

- **Never duplicate prose, tables, diagrams, or rationale across docs.** If two docs would describe the same thing, one owns it; the other replaces its copy with a **heading reference only**.
- A heading reference is a markdown link to the canonical section's GitHub anchor (heading lowercased, spaces → `-`, punctuation dropped):

  ```markdown
  <!-- ❌ duplicating the explanation -->
  The session cookie is SameSite=None; Partitioned, so it can't ride the
  cross-site top-level OAuth redirect... (3 more sentences)

  <!-- ✅ heading ref only -->
  Cookie partitioning is why the install ticket exists — see
  [Pipedrive Install Flow § Security Considerations](./pipedrive-install-flow.md#security-considerations).
  ```

- **Pick the owner by primary concern**, not by who wrote it first. Examples in this folder:
  - The `@repo/shared` substrate, DTO/codegen rules → `shared-types.md` owns; everyone else links.
  - The `resolveMeState` state→route mapping → `dashboard-auth.md § Tenant-context state machine` owns; `pipedrive-install-flow.md` links.
  - Role model, terminology, invite flow, one-Pipedrive→one-workspace → `roles-and-invites.md` owns.
  - OAuth install/callback, install ticket, stages → `pipedrive-install-flow.md` owns.
- **Cross-doc, not in-doc:** also avoid restating the same thing twice *within* one doc — reference your own earlier heading (`see [§Overview](#overview)`).
- When you find existing duplication, **collapse it**: keep the better copy in the owner, replace the other with a heading ref, and (if needed) move any unique detail into the owner first.

Duplication is treated as a defect: two copies drift, and a reader can't tell which is current. One home, many links.

## Two kinds of docs (don't confuse them)

| Kind | Layout | Example |
|------|--------|---------|
| **Decision doc** | The 5-section template above | `pipedrive-install-flow.md`, `shared-types.md` |
| **Progress tracker** | `Groups` · `Tasks` · `Log` (a living implementation journal) | `roles-and-invites-progress.md` |

A progress tracker is a **companion** to a decision doc (`{feature}-progress.md` next to `{feature}.md`), used while a multi-step feature is being built. It intentionally does **not** follow the decision-doc template. When in doubt, you want a **decision doc**.

---

## Naming

- Decision doc: `{feature-name}.md` — kebab-case, e.g. `pipedrive-install-flow.md`, `dashboard-auth.md`.
- Progress tracker: `{feature-name}-progress.md`.
- Name by the feature/concern, not the ticket or date.

---

## Formatting conventions

- **Tables for Decisions and Key Files** — non-negotiable (the two canonical tables above).
- **Dated change notes.** When you edit an existing decision/section, prepend a dated note rather than silently rewriting history: `2026-05-23: <what changed and why>`. This mirrors the global decision-comments rule for code. It lets a reader see how a decision evolved.
- **Reference code as `path:symbol` or `path:line`** — clickable and fact-checkable. Prefer stable references (file + symbol) over line numbers, which drift. If you cite a line, keep it current.
- **Fact-check against the implementation.** Every claim must match the actual code at write time. Stale claims are worse than no doc — when you touch a feature, fix the doc's now-false statements (e.g. flip a Gaps row to SHIPPED).
- **Status markers** in tables/trackers: ⬜ todo · 🔄 in progress · 👀 in review · ✅ done · ⚠️ blocked/needs-decision.
- Keep prose tight. Each sentence should change what the reader knows or does.

---

## Workflow

1. **Read the existing doc first** (and this README).
2. New feature/refactor → write/update the doc, **commit it separately** before code.
3. Implement; keep the doc in sync as decisions land.
4. If a change **contradicts** a documented decision → STOP, ask the user, and only then update the doc.
5. After a PR/merge, update affected docs (flip Gaps rows, add dated notes, append to the progress Log).

---

## STOP rules

The base STOP list (contradicting a decision, removing a chosen pattern, reversing data flow, switching a provider, altering a security boundary) is owned by [`.claude/rules/decision-docs.md` § STOP IMMEDIATELY when](../../../_shared/.claude/rules/decision-docs.md). In **this folder**, also STOP before a change that:

- **Duplicates content that already has an owner doc** instead of replacing it with a heading ref (see [DRY (STRICT)](#dry-strict-one-home-per-fact)).

Some docs carry their own `STOP Rules` section with feature-specific tripwires — honor those too.

---

## Source of truth references

- Workflow rule: [`.claude/rules/decision-docs.md`](../../../_shared/.claude/rules/decision-docs.md)
- Decision-comments rule (the *why*, dated edits): project `CLAUDE.md`
- Feature design specs (deeper than these docs): `docs/superpowers/specs/`
