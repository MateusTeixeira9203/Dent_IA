# Workflow: Audit Mode

Review existing motion design and produce a per-designer report. Reconnaissance first, then a full audit, then a structured report. Never apply rules blindly.

## Required Reading

Read as you reach each step (not all upfront):
1. `references/audit-checklist.md` — your systematic guide (STEP 2)
2. The weighted designer file(s) — `emil-kowalski.md`, `jakub-krehel.md`, `jhey-tompkins.md` (STEP 2)
3. `references/accessibility.md` — mandatory every audit (STEP 2)
4. `references/anti-checklist.md` — the quality gate: AI-slop motion categories + anti-patterns to flag (STEP 2)
5. `references/motion-cookbook.md` — recipes for the recommended-fix code in each finding (STEP 3)

---

## STEP 1: Context Reconnaissance (DO THIS FIRST)

Before auditing any code, understand the project context.

### Gather Context

Check these sources:
1. **CLAUDE.md** — Any explicit context about the project's purpose or design intent
2. **package.json** — What type of app? (Next.js marketing site vs Electron productivity app vs mobile PWA)
3. **Existing animations** — Grep for `motion`, `animate`, `transition`, `@keyframes`. What durations are used? What patterns exist?
4. **Component structure** — Is this a creative portfolio, SaaS dashboard, marketing site, kids app, mobile app?

### Motion Gap Analysis (CRITICAL - Don't Skip)

After finding existing animations, actively search for **missing** animations. These are UI changes that happen without any transition:

**Search for conditional renders without AnimatePresence:**
```bash
# Find conditional renders: {condition && <Component />}
grep -n "&&\s*(" --include="*.tsx" --include="*.jsx" -r .

# Find ternary UI swaps: {condition ? <A /> : <B />}
grep -n "?\s*<" --include="*.tsx" --include="*.jsx" -r .
```

**For each conditional render found, check:**
- Is it wrapped in `<AnimatePresence>`?
- Does the component inside have enter/exit animations?
- If NO to both → this is a **motion gap** that needs fixing

**Common motion gap patterns:**
- `{isOpen && <Modal />}` — Modal appears/disappears instantly
- `{mode === "a" && <ControlsA />}` — Controls swap without transition
- `{isLoading ? <Spinner /> : <Content />}` — Loading state snaps
- `style={{ height: isExpanded ? 200 : 0 }}` — Height changes without CSS transition
- Inline styles with dynamic values but no `transition` property

**Where to look for motion gaps:**
- Inspector/settings panels with mode switches
- Conditional form fields
- Tab content areas
- Expandable/collapsible sections
- Toast/notification systems
- Loading states
- Error states

### State Your Inference

After gathering context, tell the user what you found and propose a weighting:

```
## Reconnaissance Complete

**Project type**: [What you inferred — e.g., "Kids educational app, mobile-first PWA"]
**Existing animation style**: [What you observed — e.g., "Spring animations (500-600ms), framer-motion, active:scale patterns"]
**Likely intent**: [Your inference — e.g., "Delight and engagement for young children"]

**Motion gaps found**: [Number] conditional renders without AnimatePresence
- [List the files/areas with gaps, e.g., "Settings panel mode switches", "Loading states"]

**Proposed perspective weighting**:
- **Primary**: [Designer] — [Why]
- **Secondary**: [Designer] — [Why]
- **Selective**: [Designer] — [When applicable]

Does this approach sound right? Should I adjust the weighting before proceeding with the full audit?
```

Use the Context-to-Perspective Mapping table in SKILL.md to propose the weighting.

### Wait for User Confirmation

**STOP and wait for the user to confirm or adjust.** Do not proceed to the full audit until they respond.

If `AskUserQuestion` is available, present the decision as tappable options:
- **Confirm weighting** — Proceed with the proposed primary/secondary/selective designers
- **Adjust primary** — Swap which designer is primary (e.g., prioritize delight over restraint)
- **Adjust secondary** — Change the secondary lens while keeping primary
- **Rebuild weighting** — The project type inference was wrong; start over

Otherwise ask in plain text: "Does this weighting sound right, or should I adjust?"

If they adjust (e.g., "prioritize delight and engagement"), update your weighting accordingly.

---

## STEP 2: Full Audit (After User Confirms)

Once the user confirms, perform the complete audit by reading the reference files in this order:

### 2a. Read the Audit Checklist First
**Read `references/audit-checklist.md`** — Use this as your systematic guide. It provides the structured checklist of what to evaluate.

### 2b. Read Designer Files for Your Weighted Perspectives
Based on your context weighting, read the relevant designer files:
- **Read `references/emil-kowalski.md`** if Emil is primary/secondary — Restraint philosophy, frequency rules, decision frameworks
- **Read `references/jakub-krehel.md`** if Jakub is primary/secondary — Production polish philosophy, what to check
- **Read `references/jhey-tompkins.md`** if Jhey is primary/secondary — Playful experimentation philosophy, opportunities to surface

### 2c. Read Topical References as Needed
- **Read `references/accessibility.md`** — MANDATORY. Always check for prefers-reduced-motion. No exceptions.
- **Read `references/anti-checklist.md`** — Apply this as the audit's quality gate. AI-slop categories at the top (pulsing indicators, hover-scale-on-everything, stagger-spam, etc.) trigger findings; perspective-specific and general anti-patterns sit below. Each category includes a frequency heuristic so single intentional uses don't trip the gate.
- **Read `references/performance.md`** — If you see complex animations, check for GPU optimization issues
- **Read `references/motion-cookbook.md`** — Reference when making specific implementation recommendations (the recommended-fix code for each finding)

---

## STEP 3: Output Format (markdown report, inline)

> **Adaptação SaaS Base:** o upstream gera um relatório HTML branded com demos em
> loop (`output-format.md` + `demo-shell.html`). Aqui o audit emite **markdown
> inline** — mais enxuto e sem duplicar a `design-review`. Para auditoria visual
> do renderizado, a `design-review` continua sendo a ferramenta.

Produce the report **inline as markdown**. Do not write files, do not open a browser.
Order findings by severity: 🔴 Critical → 🟡 Important → 🟢 Opportunities. Do **not**
summarize — users want the full per-lens perspective.

### Report structure

```markdown
# 🎬 Motion Audit — {project name}

**Project type:** {inferred}  ·  **Weighting:** {Primary} → {Secondary} → {Selective}
**Tally:** 🔴 {N} Critical · 🟡 {N} Important · 🟢 {N} Opportunities

## 🔴 Critical
### {Finding title}
- **Where:** `path/to/file.tsx:42`
- **Problem:** {what's wrong + which anti-checklist category / frequency tell}
- **Lens:** {Designer} — {why it matters through this lens}
- **Fix:** {1-2 line recommendation}
  ```tsx
  // recommended motion code, from references/motion-cookbook.md
  ```

## 🟡 Important
{same shape as Critical}

## 🟢 Opportunities
{text only — no code block required; surface what the motion could become}

## Working well
- {things the existing motion does right — credit them}

## Through each lens
- **{Primary}:** {1-2 sentence verdict}
- **{Secondary}:** {1-2 sentence verdict}
```

### Rules

- **Critical + Important findings get a recommended-fix code block** (read the audited
  code + the relevant lens file + `references/motion-cookbook.md` for the recipe).
  Opportunities are text only.
- **Always include the `prefers-reduced-motion` guard** in any code you recommend
  (mandatory — see `references/accessibility.md`).
- **Prefer Motion / Framer Motion** for React fixes; CSS for HTML; reach for `gsap-core`
  only when the case genuinely needs GSAP (timelines, ScrollTrigger).
- **Don't animate the report itself** — no theatrics; the audit exists to catch slop,
  not produce it.

---

## Agent Gotchas (Self-Check Before Writing the Report)

- **Don't summarize per-lens findings.** Each finding needs its location, the problem,
  the lens, and a fix. Each section needs its `Through each lens` verdict.
- **Don't recommend motion without a `prefers-reduced-motion` guard.** Mandatory in
  every code block you output.
- **Don't flag a single intentional use as slop.** The anti-checklist tells are about
  *frequency and uniformity* — one tasteful instance is polish, not a finding.
- **Don't cap durations universally.** Check the context weighting first (a kids app is
  not a productivity tool).
- **Don't animate the report itself.** No theatrics — the audit exists to catch slop.
- **Don't blindly apply Emil's restraint everywhere.** Weight the designers by the
  project context you confirmed in STEP 1.

---

## Success Criteria

- [ ] Context gathered (CLAUDE.md, package.json, existing animations, structure)
- [ ] Motion gap analysis run — conditional renders checked for missing animation
- [ ] Weighting proposed and confirmed by the user
- [ ] Audit checklist worked through systematically
- [ ] Anti-checklist applied — AI-slop categories checked against the codebase
- [ ] Accessibility checked — prefers-reduced-motion verified (mandatory)
- [ ] Markdown report rendered inline, ordered by severity, with full per-lens sections
- [ ] Critical + Important findings include a recommended-fix code block
