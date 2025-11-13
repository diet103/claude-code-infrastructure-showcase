# HUMMBL Base120 Application Guide for Claude Code
**Version**: 1.0
**Purpose**: Systematic application of Base120 mental models to planning and implementation
**Status**: Production Reference

---

## Overview

This guide maps the HUMMBL Base120 mental models to Claude Code's planning and implementation workflow. It provides a structured approach to improve task analysis, planning quality, implementation rigor, and outcome reliability.

---

## Workflow Phase Mapping

### Phase 1: Initial Request Analysis
**Goal**: Understand user intent, establish context, surface constraints

| Model | Application | When to Use |
|-------|------------|-------------|
| **P6** Point-of-View Anchoring | Establish whose perspective matters (end user, system, developer, stakeholder) | Always at task start |
| **P10** Context Windowing | Define explicit boundaries: time horizon, scope, what's in/out of scope | Complex or ambiguous requests |
| **P15** Assumption Surfacing | Document what you're assuming about: tech stack, user knowledge, existing code | Before planning begins |
| **P2** Stakeholder Mapping | Identify who will be affected: users, team members, systems, future maintainers | Feature implementations |
| **DE11** Scope Delimitation | Define precise boundaries of what is/isn't included in this task | Large requests |

**Example Pattern**:
```
User: "Add authentication to the app"

Apply P6: From whose POV? (Developer implementing, user logging in, admin managing)
Apply P10: Context window = this session only, or production-ready with docs?
Apply P15: Assumptions: Using existing auth lib? JWT vs session? Database exists?
Apply DE11: In scope = login/logout. Out of scope = password reset, 2FA, OAuth
```

---

### Phase 2: Planning & Task Breakdown
**Goal**: Transform request into executable, ordered tasks

| Model | Application | When to Use |
|-------|------------|-------------|
| **DE8** Work Breakdown Structure | Create hierarchical todo list with clear ownership and dependencies | Multi-step tasks (3+) |
| **P1** First Principles Framing | Reduce to fundamentals: What problem are we actually solving? | Novel or unclear requirements |
| **DE4** Layered Breakdown | Decompose from system → subsystem → component → function | Complex implementations |
| **SY1** Leverage Points | Identify where small changes create big impact (avoid over-engineering) | Performance/refactoring |
| **IN2** Premortem Analysis | Ask "This failed. Why?" before starting. Plan mitigation. | Critical features, production code |
| **DE19** Critical Path Unwinding | Identify longest dependency chain determining minimum time | Time-sensitive work |
| **IN18** Kill-Criteria & Stop Rules | Define failure conditions that would abort the task | Experimental work |

**Planning Checklist**:
- [ ] Applied DE8: Created todo list with clear tasks?
- [ ] Applied P1: Identified core problem, not just symptoms?
- [ ] Applied IN2: Run premortem, identified top 3 failure modes?
- [ ] Applied SY1: Found leverage points to avoid unnecessary work?

---

### Phase 3: Implementation
**Goal**: Write code, make changes, maintain quality

| Model | Application | When to Use |
|-------|------------|-------------|
| **CO8** Layered Abstraction | Separate concerns: presentation/logic/data, enforce boundaries | New features, refactoring |
| **DE3** Modularization | Create self-contained units with minimal coupling | Any new code |
| **CO9** Interface Contracts | Define explicit contracts between components (types, APIs) | Multi-component work |
| **RE9** Iterative Prototyping | Build smallest testable version first, then enhance | Complex features |
| **IN1** Subtractive Thinking | Remove code/complexity rather than adding where possible | Code cleanup |
| **RE1** Recursive Improvement | Make small improvements continuously rather than waiting | Ongoing work |
| **CO12** Modular Interoperability | Ensure components work together via standard interfaces | Integration work |
| **DE13** Failure Mode Analysis | Enumerate what could go wrong: validation, errors, edge cases | Critical paths |

**Implementation Patterns**:

**Pattern A: New Feature**
1. Apply CO8: Design layers (UI → Service → Repository)
2. Apply DE3: Create modular components
3. Apply CO9: Define TypeScript interfaces first
4. Apply RE9: Implement minimal version, test, enhance
5. Apply DE13: List failure modes, add error handling

**Pattern B: Refactoring**
1. Apply IN1: What can we remove?
2. Apply CO8: Better layer separation?
3. Apply DE3: Better module boundaries?
4. Apply RE1: Small, safe changes with tests

**Pattern C: Bug Fix**
1. Apply DE1: Root cause analysis (5 Whys)
2. Apply DE14: Isolate the variable causing failure
3. Apply IN7: Test boundary conditions
4. Apply DE13: Check for similar failure modes elsewhere

---

### Phase 4: Validation & Testing
**Goal**: Ensure changes work correctly and don't break existing functionality

| Model | Application | When to Use |
|-------|------------|-------------|
| **IN7** Boundary Testing | Test edge cases, extremes, empty inputs, max values | All implementations |
| **CO16** System Integration Testing | Verify components work together, not just in isolation | Multi-component changes |
| **IN10** Red Teaming | Actively try to break your implementation | Critical features |
| **DE14** Variable Control & Isolation | Change one thing at a time when debugging | Troubleshooting |
| **IN4** Contra-Logic | Argue why your solution might be wrong | Before finalizing |

**Testing Checklist**:
- [ ] Applied IN7: Tested edge cases (empty, null, max, min)?
- [ ] Applied CO16: Tested integration points between components?
- [ ] Applied IN10: Tried to break it (wrong inputs, race conditions)?
- [ ] Applied IN4: Challenged my own assumptions?

---

### Phase 5: Completion & Handoff
**Goal**: Finish properly, enable future work, learn from outcomes

| Model | Application | When to Use |
|-------|------------|-------------|
| **RE16** Retrospective→Prospective | Review what worked/didn't, document learnings | End of significant tasks |
| **SY18** Measurement & Telemetry | Verify expected outcomes (tests pass, builds work, metrics improve) | Before marking complete |
| **P8** Narrative Framing | Write commit messages as causal stories (why, not just what) | All commits |
| **RE17** Versioning & Diff | Review all changes before committing | All commits |
| **RE19** Auto-Refactor | Clean up implementation without changing behavior | Before finalizing |

**Completion Checklist**:
- [ ] Applied SY18: Verified all success criteria met?
- [ ] Applied RE17: Reviewed all diffs carefully?
- [ ] Applied P8: Commit message explains WHY, not just WHAT?
- [ ] Applied RE16: Documented learnings for next time?

---

## Meta-Process: Improving How You Work

| Model | Application | Frequency |
|-------|------------|-----------|
| **RE3** Meta-Learning | Reflect on what planning/implementation approaches work best | After major tasks |
| **RE6** Recursive Framing | Apply mental models to selecting mental models | When stuck or uncertain |
| **SY19** Meta-Model Selection | Choose appropriate frameworks for specific problem types | Start of each task |
| **RE11** Calibration Loops | Check predictions vs outcomes to improve future estimates | Ongoing |
| **RE20** Recursive Governance | Adapt your working rules based on their effectiveness | Monthly review |

---

## Quick Reference by Task Type

### Task Type: Feature Implementation
**Primary Models**: P1, P10, DE8, IN2, CO8, DE3, RE9, IN7, CO16
**Flow**:
1. P1: What problem does this actually solve?
2. P10: Define scope boundaries
3. DE8: Break into tasks
4. IN2: Run premortem
5. CO8 + DE3: Design modular, layered implementation
6. RE9: Build iteratively
7. IN7 + CO16: Test thoroughly

### Task Type: Bug Fix
**Primary Models**: DE1, P10, DE14, IN7, DE13
**Flow**:
1. DE1: Root cause analysis (5 Whys)
2. P10: Scope - just this bug, or related issues?
3. DE14: Isolate failing variable
4. Fix implementation
5. IN7: Test boundaries
6. DE13: Check for similar failure modes

### Task Type: Refactoring
**Primary Models**: IN1, P1, CO8, DE3, IN2, RE19
**Flow**:
1. IN1: What can we remove?
2. P1: What's the fundamental purpose?
3. CO8: Improve layer separation
4. DE3: Better module boundaries
5. IN2: What could break?
6. RE19: Maintain behavior while improving structure

### Task Type: Performance Optimization
**Primary Models**: SY1, DE7, DE1, SY18, IN15
**Flow**:
1. SY18: Measure current performance
2. DE7: Pareto - what 20% causes 80% of slowness?
3. SY1: Identify leverage points
4. DE1: Root cause of bottleneck
5. IN15: Remove artificial constraints
6. Optimize, then measure again

### Task Type: Debugging
**Primary Models**: DE1, DE14, IN7, P10, IN3
**Flow**:
1. P10: Define reproduction scope
2. DE1: 5 Whys to root cause
3. DE14: Isolate variables
4. IN7: Test edge cases
5. IN3: Try inverse (what if opposite were true?)
6. Fix and verify

### Task Type: Architecture Design
**Primary Models**: P1, CO8, DE3, SY2, IN2, CO17
**Flow**:
1. P1: First principles - what are we really building?
2. SY2: Define system boundaries
3. CO8: Design layers
4. DE3: Modularize
5. CO17: Orchestration vs choreography decision
6. IN2: Premortem for design

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Wrong | Correct Approach |
|-------------|-----------|------------------|
| **Skipping P15** (Assumption Surfacing) | Work on wrong assumptions | Always document assumptions before planning |
| **No DE8** (Work Breakdown) | Lose track, forget tasks | Use TodoWrite for 3+ step tasks |
| **Ignoring IN2** (Premortem) | Predictable failures occur | Always ask "this failed, why?" before critical work |
| **Missing IN7** (Boundary Testing) | Edge cases break production | Test empty, null, max, min, invalid inputs |
| **No RE16** (Retrospective) | Repeat same mistakes | Review outcomes, document learnings |
| **Overusing CO1** (Synergy) | Over-engineering, premature optimization | Apply SY1 (Leverage Points) - simple first |

---

## Integration with Existing Claude Code Patterns

### TodoWrite Tool
- Implements **DE8** (Work Breakdown Structure)
- Supports **SY18** (Measurement & Telemetry) via status tracking
- Enables **RE1** (Recursive Improvement) through continuous updates

### Agents (Task Tool)
- code-refactor-master: Applies **IN1**, **CO8**, **DE3**, **RE19**
- code-architecture-reviewer: Applies **P1**, **IN2**, **IN4**, **SY2**
- auth-route-debugger: Applies **DE1**, **DE14**, **IN7**
- refactor-planner: Applies **DE8**, **IN2**, **SY1**

### Git Workflow
- Commit messages: **P8** (Narrative Framing)
- Branch strategy: **SY2** (System Boundaries)
- Review before push: **RE17** (Versioning & Diff)

---

## Decision Trees

### "Should I use an agent or work directly?"

```
Start → Is this exploring/researching codebase?
        ├─ Yes → Use Task tool with Explore agent (applies P4, P7, CO18)
        └─ No → Is this refactoring code structure?
                ├─ Yes → Use code-refactor-master agent (applies IN1, CO8, DE3)
                └─ No → Is this reviewing written code?
                        ├─ Yes → Use code-architecture-reviewer (applies P1, IN2)
                        └─ No → Work directly, apply models manually
```

### "Which models should I apply now?"

```
Start → What phase am I in?
        ├─ Initial request → P6, P10, P15, DE11
        ├─ Planning → DE8, P1, IN2, SY1
        ├─ Implementing → CO8, DE3, RE9, DE13
        ├─ Testing → IN7, CO16, IN10
        └─ Completing → RE16, SY18, P8, RE17
```

---

## Measurement & Continuous Improvement

### Success Metrics (Apply SY18)
- Task completion rate without rework
- Number of issues caught before completion vs after
- User satisfaction with outcomes
- Time from request to working solution

### Calibration Questions (Apply RE11)
- Did my initial scope estimate match actual scope?
- Did premortem-identified failures occur?
- Were there failure modes I didn't anticipate?
- Did leverage points deliver expected impact?

### Learning Loop (Apply RE3, RE16)
After significant tasks:
1. What models did I apply?
2. Which were most valuable?
3. Which did I skip that would have helped?
4. What patterns emerged?
5. How will I adapt next time?

---

## Advanced Patterns

### Pattern: Recursive Meta-Planning (RE6 + SY19)
When uncertain which models to apply:
1. Apply SY19 to select meta-framework
2. Use RE6 to apply models to model selection
3. Check against task type quick reference
4. Validate with IN4 (Contra-Logic)

### Pattern: Multi-Model Synthesis (CO4 + CO20)
For complex problems requiring multiple perspectives:
1. Apply P7 (Perspective Switching) to view from multiple angles
2. Use CO4 (Interdisciplinary Synthesis) to merge insights
3. Apply CO20 (Holistic Integration) to unify into coherent approach

### Pattern: Constraint Navigation (IN15 + SY1)
When feeling blocked:
1. Apply P15 to surface assumptions
2. Use IN15 (Constraint Reversal) to question each constraint
3. Apply SY1 to find leverage points within remaining constraints
4. Use IN3 (Problem Reversal) if still stuck

---

## Reference Card: Model Selection by Signal

**User says "this is urgent"** → Apply SY1 (Leverage Points), DE7 (Pareto)
**User says "I'm not sure what I want"** → Apply P6 (POV Anchoring), P10 (Context Windowing)
**User says "this keeps breaking"** → Apply DE1 (Root Cause), DE13 (Failure Mode Analysis)
**User says "make it better"** → Apply IN1 (Subtractive Thinking), SY1 (Leverage Points)
**User says "add feature X"** → Apply P1 (First Principles), IN2 (Premortem), DE8 (WBS)
**User says "it's too slow"** → Apply SY18 (Measure), DE7 (Pareto), SY1 (Leverage Points)
**User says "refactor this"** → Apply IN1 (Subtraction), CO8 (Layers), DE3 (Modularization)

---

## Validation Checklist

Before marking any task complete:
- [ ] **P10**: Scope boundaries met?
- [ ] **SY18**: Success criteria verified?
- [ ] **IN7**: Edge cases tested?
- [ ] **RE17**: All changes reviewed?
- [ ] **P8**: Commit message tells causal story?
- [ ] **RE16**: Learnings documented?

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-13 | Initial application guide for Claude Code workflows |

---

**Usage**: Reference this guide at task start, during planning, when stuck, and at completion. Apply RE3 (Meta-Learning) to continuously improve how you use these models.
