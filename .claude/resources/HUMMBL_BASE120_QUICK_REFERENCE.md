# HUMMBL Base120 Quick Reference for Claude Code
**Version**: 1.0
**Purpose**: Fast lookup during task execution

---

## Essential Pre-Task Checklist (60 seconds)

Before starting ANY task, apply these 5 models:

1. **P6** Point-of-View Anchoring - Whose perspective? (user/dev/system/business)
2. **P10** Context Windowing - What's in/out of scope? Time horizon?
3. **P15** Assumption Surfacing - What am I assuming? (tech stack, user knowledge, existing code)
4. **DE11** Scope Delimitation - Precise boundaries: included vs excluded
5. **DE8** Work Breakdown Structure - Break into 3-7 concrete tasks (use TodoWrite)

**Status Check**: Can I answer these 5 questions clearly? If no → stop and clarify first.

---

## Task Type → Model Mapping

### Bug Fix
**Core Models**: DE1 → DE14 → IN7 → DE13
1. DE1: 5 Whys to root cause
2. DE14: Isolate the failing variable
3. IN7: Test edge cases
4. DE13: Check for similar failures elsewhere

### Feature Implementation
**Core Models**: P1 → IN2 → DE8 → CO8 → RE9 → IN7
1. P1: What problem does this solve? (first principles)
2. IN2: Premortem - "This failed. Why?"
3. DE8: Break into tasks (TodoWrite)
4. CO8: Design layers (UI → Service → Data)
5. RE9: Build smallest version first, iterate
6. IN7: Test boundaries before completion

### Refactoring
**Core Models**: IN1 → CO8 → DE3 → RE19
1. IN1: What can we REMOVE?
2. CO8: Better layer separation?
3. DE3: Better module boundaries?
4. RE19: Maintain behavior, improve structure

### Performance Optimization
**Core Models**: SY18 → DE7 → SY1 → measure again
1. SY18: Measure current performance
2. DE7: Pareto - what 20% causes 80% slowness?
3. SY1: Identify leverage points
4. SY18: Measure after changes

### Debugging
**Core Models**: P10 → DE1 → DE14 → IN7
1. P10: Define reproduction scope
2. DE1: 5 Whys
3. DE14: Isolate variables
4. IN7: Test edge cases

---

## Phase-Based Model Selection

### Phase 1: Request Analysis (ALWAYS)
**Apply**: P6, P10, P15, P2 (if multiple stakeholders), DE11

### Phase 2: Planning (if 3+ steps)
**Apply**: DE8 (TodoWrite), P1, IN2, SY1, DE19 (if time-sensitive)

### Phase 3: Implementation
**Apply**: CO8, DE3, CO9 (define interfaces), RE9 (iterate), DE13 (failure modes)

### Phase 4: Testing
**Apply**: IN7, CO16, IN10 (for critical features), IN4 (challenge yourself)

### Phase 5: Completion
**Apply**: SY18 (verify outcomes), RE17 (review diffs), P8 (commit message), RE16 (retrospective)

---

## Signal-Based Triggers

**User says** → **Apply models**

"this is urgent" → SY1, DE7
"I'm not sure what I want" → P6, P10, P15
"this keeps breaking" → DE1, DE13
"make it better" → IN1, SY1
"add feature X" → P1, IN2, DE8
"it's too slow" → SY18, DE7, SY1
"refactor this" → IN1, CO8, DE3
"help me understand" → P4, P7, CO18
"what could go wrong" → IN2, DE13
"is this the right approach" → P1, IN4

---

## Critical Anti-Patterns

**NEVER skip these**:

1. ❌ No P15 (Assumption Surfacing) → working on wrong assumptions
2. ❌ No DE8 (Work Breakdown) for 3+ step tasks → lose track, forget tasks
3. ❌ No IN2 (Premortem) before critical work → predictable failures occur
4. ❌ No IN7 (Boundary Testing) → edge cases break production
5. ❌ No RE16 (Retrospective) after significant work → repeat same mistakes

---

## Decision: Use Agent or Work Directly?

### Use Task Tool with Agent When:
- **Explore agent**: Researching codebase structure, finding patterns
- **code-refactor-master**: Refactoring across multiple files
- **code-architecture-reviewer**: Reviewing completed implementation
- **refactor-planner**: Planning complex refactoring
- **auth-route-debugger**: Authentication/route issues
- **frontend-error-fixer**: Frontend build or runtime errors

### Work Directly When:
- Small, localized changes (1-2 files)
- Clear, simple task
- Already have full context

**Apply SY19** (Meta-Model Selection) when uncertain

---

## Completion Checklist (Before marking any task done)

- [ ] **P10**: All scope boundaries met?
- [ ] **SY18**: Success criteria verified? (tests pass, builds work)
- [ ] **IN7**: Edge cases tested? (empty, null, max, min, invalid)
- [ ] **RE17**: All changes reviewed in diff?
- [ ] **P8**: Commit message explains WHY, not just WHAT?
- [ ] **RE16**: Documented learnings for next time?

---

## Emergency: When Stuck

Apply in order:
1. **P15**: What am I assuming that might be wrong?
2. **IN15**: What constraints am I accepting that I could remove?
3. **IN3**: What if I solved the OPPOSITE problem?
4. **P7**: What would this look like from a different perspective?
5. **SY1**: Where's the leverage point I'm missing?

---

## Model Combinations for Common Situations

### Unknown Requirements
P6 + P10 + P15 + P2 → clarify before proceeding

### Complex System Change
P1 + DE4 + IN2 + CO8 + DE3 → principled, layered design

### Production Bug
DE1 + DE14 + IN7 + DE13 → root cause, isolate, test, prevent recurrence

### Code Review
P1 + IN4 + CO8 + DE3 + IN2 → challenge assumptions, check architecture

### Technical Debt
IN1 + SY1 + DE7 + RE19 → remove, leverage, pareto, refactor

---

## Integration with Claude Code Tools

### TodoWrite Tool
**Implements**: DE8 (Work Breakdown Structure)
**Use when**: 3+ step tasks, complex features

### Task Tool (Agents)
**Applies models internally**:
- code-refactor-master: IN1, CO8, DE3, RE19
- code-architecture-reviewer: P1, IN2, IN4
- Explore: P4, P7, CO18

### Git Operations
**Apply**:
- Commit messages: P8 (Narrative Framing)
- Before push: RE17 (Versioning & Diff)

---

## 30-Second Model Lookup

**Perspective**: P1, P6, P7, P10, P15
**Inversion**: IN1, IN2, IN7, IN10, IN15
**Composition**: CO8, CO9, CO16
**Decomposition**: DE1, DE3, DE4, DE7, DE8, DE11, DE13, DE14
**Recursion**: RE1, RE9, RE16, RE17, RE19
**Systems**: SY1, SY18, SY19

---

## Meta-Process (Monthly Review)

**Apply RE3** (Meta-Learning):
1. What models did I use most?
2. Which were most valuable?
3. Which did I skip that would have helped?
4. How will I adapt?

**Apply RE11** (Calibration Loops):
1. Did my scope estimates match reality?
2. Did premortem-identified failures occur?
3. What didn't I anticipate?

---

## Reference Links

- Full model definitions: `HUMMBL_BASE120_DEFINITIVE_REFERENCE.md`
- Detailed application guide: `HUMMBL_BASE120_CLAUDE_CODE_APPLICATION.md`
- Source: Google Drive document (Oct 16, 2025)

---

**Quick Usage**: Keep this open during task execution. Scan relevant section based on phase or task type. Apply models systematically.
