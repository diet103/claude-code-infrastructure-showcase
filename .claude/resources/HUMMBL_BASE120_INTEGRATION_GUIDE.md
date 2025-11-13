# HUMMBL Base120 Integration Guide
**Version**: 1.0
**Purpose**: How Base120 enhances Claude Code workflows
**Audience**: Developers, AI Engineers, Claude Code users

---

## Overview

The HUMMBL Base120 framework provides a systematic vocabulary of 120 mental models organized into 6 transformations. This guide shows how Base120 integrates with and enhances existing Claude Code infrastructure including skills, agents, commands, and workflows.

---

## Base120 Documents

### 1. Definitive Reference
**File**: `HUMMBL_BASE120_DEFINITIVE_REFERENCE.md`
**Purpose**: Authoritative list of all 120 models with definitions
**When to use**: Lookup exact model names and definitions

### 2. Application Guide
**File**: `HUMMBL_BASE120_CLAUDE_CODE_APPLICATION.md`
**Purpose**: Comprehensive guide for applying models to Claude Code workflows
**When to use**: Planning how to approach complex tasks, designing workflows

### 3. Quick Reference
**File**: `HUMMBL_BASE120_QUICK_REFERENCE.md`
**Purpose**: Fast lookup during active task execution
**When to use**: During task execution for quick model selection

---

## Integration with Existing Infrastructure

### Skills Enhanced by Base120

#### backend-dev-guidelines
**Base120 Enhancement**:
- Layered architecture design → **CO8** (Layered Abstraction)
- Service layer patterns → **DE3** (Modularization)
- Error handling → **DE13** (Failure Mode Analysis)
- Dependency injection → **CO9** (Interface Contracts)

**Example Integration**:
```
When creating a new route:
1. Apply P1: What problem does this route solve?
2. Apply DE8: Break into controller → service → repository
3. Apply CO8: Maintain layer boundaries
4. Apply DE13: Enumerate failure modes (validation, auth, db errors)
5. Apply IN7: Test edge cases
```

#### frontend-dev-guidelines
**Base120 Enhancement**:
- Component design → **DE3** (Modularization)
- Features directory → **CO8** (Layered Abstraction)
- Suspense patterns → **CO10** (Pipeline Orchestration)
- Performance optimization → **SY1** (Leverage Points) + **DE7** (Pareto)

**Example Integration**:
```
When creating a new feature:
1. Apply P10: Define feature scope boundaries
2. Apply CO8: Plan layers (UI → hooks → API → types)
3. Apply DE3: Break into modular components
4. Apply RE9: Build minimal version, iterate
5. Apply IN7: Test edge cases (loading, error, empty states)
```

#### error-tracking
**Base120 Enhancement**:
- Error capturing → **SY18** (Measurement & Telemetry)
- Performance monitoring → **SY1** (Leverage Points)
- Error analysis → **DE1** (Root Cause Analysis)

**Example Integration**:
```
When implementing Sentry:
1. Apply SY18: What metrics matter? (error rate, performance, user impact)
2. Apply DE13: What failure modes to track?
3. Apply P2: Who are stakeholders? (devs, ops, users)
4. Apply CO8: Integrate at appropriate layers
```

#### route-tester
**Base120 Enhancement**:
- Test planning → **DE8** (Work Breakdown Structure)
- Edge case testing → **IN7** (Boundary Testing)
- Integration testing → **CO16** (System Integration Testing)

---

### Agents Enhanced by Base120

#### code-refactor-master
**Applies these models internally**:
- IN1 (Subtractive Thinking): Remove unnecessary code
- CO8 (Layered Abstraction): Improve layer separation
- DE3 (Modularization): Better module boundaries
- RE19 (Auto-Refactor): Maintain behavior while improving structure

**User can enhance by**:
- Apply P1 before requesting refactor: What's the fundamental purpose?
- Apply IN2 (Premortem): What could break during refactor?
- Apply SY1: What's the leverage point to maximize impact?

#### code-architecture-reviewer
**Applies these models internally**:
- P1 (First Principles): Does this solve the real problem?
- IN2 (Premortem): What failure modes exist?
- IN4 (Contra-Logic): Challenge implementation decisions
- CO8 (Layered Abstraction): Is architecture properly layered?

**User can enhance by**:
- Apply P15 before review: Surface assumptions for reviewer to validate
- Apply P2: Identify all stakeholders the code affects

#### refactor-planner
**Applies these models internally**:
- DE8 (Work Breakdown Structure): Create step-by-step plan
- IN2 (Premortem): Identify risks
- SY1 (Leverage Points): Find high-impact changes
- DE19 (Critical Path): Identify dependencies

**User can enhance by**:
- Apply P10 first: Define scope boundaries clearly
- Apply IN18: Define kill-criteria for the refactoring

#### Explore
**Applies these models internally**:
- P4 (Lens Shifting): View code from different angles
- P7 (Perspective Switching): Rotate through viewpoints
- CO18 (Knowledge Graphing): Map code relationships
- DE6 (Taxonomy): Organize code structure

**User can enhance by**:
- Apply P10: Define exploration boundaries
- Apply P6: Anchor perspective (architectural? functional? historical?)

---

### Commands Enhanced by Base120

#### /dev-docs
**Base120 Enhancement**:
```
When creating strategic plans:
1. Apply P1: First principles - what are we really building?
2. Apply DE8: Create hierarchical task breakdown
3. Apply IN2: Run premortem on the plan
4. Apply SY1: Identify leverage points
5. Apply DE19: Map critical path
```

#### /dev-docs-update
**Base120 Enhancement**:
```
When updating documentation:
1. Apply P12: Temporal framing - what changed and why?
2. Apply P2: Who needs this documentation?
3. Apply CO8: Organize by layers/concerns
4. Apply P8: Frame as narrative (conflict, choice, consequence)
```

---

## Workflow Integration Patterns

### Pattern 1: Task Initiation
**Standard Workflow**:
1. User makes request
2. Claude analyzes
3. Claude plans

**Base120 Enhanced Workflow**:
1. User makes request
2. **Apply P6, P10, P15** (anchor perspective, define context, surface assumptions)
3. **Apply DE11** (scope delimitation)
4. **Apply P2** if multiple stakeholders
5. Plan with **DE8** (TodoWrite)

### Pattern 2: Planning Complex Features
**Standard Workflow**:
1. Break into tasks
2. Start implementing

**Base120 Enhanced Workflow**:
1. **Apply P1** (first principles - what problem?)
2. **Apply IN2** (premortem - what could fail?)
3. **Apply SY1** (find leverage points)
4. **Apply DE8** (hierarchical breakdown with TodoWrite)
5. **Apply DE19** (identify critical path)
6. **Apply IN18** (define kill-criteria)
7. Start implementing

### Pattern 3: Implementation
**Standard Workflow**:
1. Write code
2. Test
3. Commit

**Base120 Enhanced Workflow**:
1. **Apply CO8 + DE3** (design layers and modules)
2. **Apply CO9** (define interfaces first)
3. **Apply RE9** (iterative prototyping - minimal first)
4. **Apply DE13** (enumerate failure modes)
5. Write code
6. **Apply IN7 + CO16** (boundary and integration testing)
7. **Apply RE17** (review diff)
8. **Apply P8** (narrative commit message)
9. Commit

### Pattern 4: Debugging
**Standard Workflow**:
1. Reproduce bug
2. Find cause
3. Fix

**Base120 Enhanced Workflow**:
1. **Apply P10** (define reproduction scope)
2. Reproduce bug
3. **Apply DE1** (5 Whys to root cause)
4. **Apply DE14** (isolate the variable)
5. Fix
6. **Apply IN7** (test edge cases)
7. **Apply DE13** (check for similar failure modes)

### Pattern 5: Code Review
**Standard Workflow**:
1. Review code
2. Provide feedback

**Base120 Enhanced Workflow**:
1. **Apply P1** (does this solve the real problem?)
2. **Apply P15** (what assumptions is this based on?)
3. Review code
4. **Apply IN4** (argue the opposite position)
5. **Apply CO8** (is layering correct?)
6. **Apply DE3** (are modules properly separated?)
7. **Apply IN2** (what could fail?)
8. Provide feedback

---

## Progressive Adoption Strategy

### Level 1: Essential Models (Start Here)
Focus on 10 core models that apply to almost every task:

1. **P6** - Point-of-View Anchoring
2. **P10** - Context Windowing
3. **P15** - Assumption Surfacing
4. **DE8** - Work Breakdown Structure
5. **DE11** - Scope Delimitation
6. **IN2** - Premortem Analysis
7. **IN7** - Boundary Testing
8. **CO8** - Layered Abstraction
9. **DE3** - Modularization
10. **SY18** - Measurement & Telemetry

**Adoption**: Use these in every task for 1-2 weeks until they become automatic.

### Level 2: Phase-Specific Models (Week 3-4)
Add phase-specific models:

**Planning Phase**: P1, SY1, DE19
**Implementation Phase**: CO9, RE9, DE13
**Testing Phase**: CO16, IN10
**Completion Phase**: RE17, P8, RE16

### Level 3: Specialized Models (Month 2+)
Add models for specific situations:

**Refactoring**: IN1, RE19, DE4
**Performance**: DE7, SY1, SY18
**Architecture**: CO17, SY2, SY11
**Meta-improvement**: RE3, RE6, SY19

### Level 4: Full Framework (Month 3+)
Use the complete Base120 framework with model selection based on context.

---

## Measurement & Validation

### Track These Metrics (Apply SY18)

**Quality Metrics**:
- Bugs found before vs after completion
- Test coverage
- Code review issues

**Process Metrics**:
- Task completion without rework
- Estimate accuracy
- Cycle time from request to completion

**Model Usage Metrics**:
- Which models used most frequently
- Which models correlated with success
- Which models were skipped that should have been applied

### Calibration Questions (Apply RE11)

After each significant task:
1. Did P10 (Context Windowing) prevent scope creep?
2. Did IN2 (Premortem) identify actual failure modes?
3. Did SY1 (Leverage Points) reduce unnecessary work?
4. Did IN7 (Boundary Testing) catch edge cases before production?
5. Did DE8 (Work Breakdown) capture all necessary tasks?

---

## Tool Integration

### TodoWrite Tool
**Maps to**: DE8 (Work Breakdown Structure)
**Enhanced usage**:
```
When creating todos:
1. Apply DE4 (Layered Breakdown) for hierarchical structure
2. Apply DE19 (Critical Path) to order tasks
3. Apply P10 to ensure scope boundaries clear in each task
4. Apply RE1 to update todos as understanding improves
```

### Task Tool (Agents)
**Maps to**: SY19 (Meta-Model Selection)
**Enhanced usage**:
```
When deciding to use an agent:
1. Apply SY19: Is this the right tool for this problem?
2. Apply P10: What context does agent need?
3. Apply DE8: What subtasks should agent handle?
4. Provide agent with relevant Base120 models to apply
```

### Git Operations
**Maps to**: P8 (Narrative Framing), RE17 (Versioning & Diff)
**Enhanced usage**:
```
Before committing:
1. Apply RE17: Review all changes in diff
2. Apply P8: Write commit message as causal story (why)
3. Apply RE16: Document learnings for retrospective
```

---

## Real-World Examples

### Example 1: Adding Authentication

**Without Base120**:
```
User: Add authentication to the app
Claude: I'll add JWT authentication...
[Implements without checking requirements]
```

**With Base120**:
```
User: Add authentication to the app

Claude applies P6, P10, P15:
- P6: Whose POV? (end user logging in, or admin managing users?)
- P10: Scope = login/logout only, or include registration, password reset, 2FA?
- P15: Assumptions to verify:
  * Using existing auth library or building custom?
  * JWT vs session-based?
  * Database schema already supports users?
  * Frontend already has auth state management?

Claude: "I want to clarify scope before implementing. By 'authentication' do you mean:
1. Just login/logout with existing user accounts?
2. Full auth system including registration and password reset?
3. Something else?

Also, any preference for JWT vs session-based auth?"

User: Just login/logout with JWT, users already exist in database

Claude applies DE8, IN2, CO8:
- DE8: Break into tasks (TodoWrite)
  1. Create auth service with JWT generation
  2. Add login route
  3. Add logout route
  4. Add auth middleware
  5. Update frontend with auth state
  6. Test all endpoints

- IN2: Premortem - what could fail?
  * JWT secret not configured
  * Token expiration issues
  * CORS problems
  * Concurrent logins

- CO8: Design layers
  * Route layer: /auth/login, /auth/logout
  * Controller layer: AuthController
  * Service layer: AuthService (JWT logic)
  * Repository layer: UserRepository (user lookup)

[Proceeds with well-planned implementation]
```

### Example 2: Performance Issue

**Without Base120**:
```
User: The dashboard is slow
Claude: I'll add caching...
[Optimizes without measuring]
```

**With Base120**:
```
User: The dashboard is slow

Claude applies SY18, P10:
- SY18: First, let me measure current performance
- P10: Define scope - slow for all users or specific scenarios?

Claude: "Before optimizing, let me measure the current performance and identify the bottleneck. Can you describe when it's slow - on initial load, when filtering, or always?"

User: It's slow on initial load, takes 5+ seconds

Claude applies DE7, SY1:
- SY18: Profile the load time - breakdown by operation
- DE7: Pareto - what 20% is causing 80% of slowness?
  * Measurement shows: 4 seconds in database query, 0.5s rendering, 0.5s other
- SY1: Leverage point = optimize that database query

Claude applies DE1:
- DE1: Why is query slow? (5 Whys)
  * Query takes 4 seconds
  * Why? Fetching all records without pagination
  * Why? No limit clause
  * Why? Frontend expects all data at once
  * Why? Original design didn't anticipate growth
  * Root cause: Missing pagination design

Claude applies IN2:
- What could break if we add pagination?
  * Frontend pagination logic
  * Export functionality
  * Search/filter behavior

[Implements pagination with proper planning]
```

---

## FAQ

### Q: Do I need to apply all 120 models to every task?
**A**: No. Start with the Essential 10 models (Level 1). Most tasks use 5-10 models total.

### Q: How do I know which models to apply?
**A**:
1. Check the Quick Reference for your task type
2. Follow the phase-based selection (request → plan → implement → test → complete)
3. Apply SY19 (Meta-Model Selection) when uncertain

### Q: Can I substitute similar mental models?
**A**: No. Base120 provides a standardized vocabulary. Don't substitute OODA Loop for P7 or Hanlon's Razor for IN4.

### Q: How does this integrate with existing skills?
**A**: Skills already apply Base120 models internally. You can enhance by applying models before/after using skills.

### Q: What if Base120 contradicts existing guidelines?
**A**: Base120 enhances, not replaces. It provides systematic vocabulary for thinking patterns already implicit in good practice.

---

## Next Steps

1. **Read**: Quick Reference (`HUMMBL_BASE120_QUICK_REFERENCE.md`)
2. **Practice**: Apply Essential 10 models to next 5 tasks
3. **Measure**: Track which models helped most (apply RE11)
4. **Expand**: Add Level 2 models after 2 weeks
5. **Calibrate**: Monthly review with RE3 (Meta-Learning)

---

## Resources

- **Definitive Reference**: `HUMMBL_BASE120_DEFINITIVE_REFERENCE.md`
- **Application Guide**: `HUMMBL_BASE120_CLAUDE_CODE_APPLICATION.md`
- **Quick Reference**: `HUMMBL_BASE120_QUICK_REFERENCE.md`
- **Source**: [Google Drive](https://docs.google.com/document/d/1yZd1CxU1ZzJjv-MBoxyc3VOD_0-IOfVK8LHL_5qr2EM/edit)

---

**Version**: 1.0
**Last Updated**: 2025-11-13
**Status**: Production Ready
