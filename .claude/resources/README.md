# Claude Code Resources Directory

This directory contains reference materials, frameworks, and guides to enhance Claude Code workflows.

---

## HUMMBL Base120 Mental Models Framework

The HUMMBL Base120 is a systematic framework of 120 mental models organized into 6 transformations (Perspective, Inversion, Composition, Decomposition, Recursion, Meta-Systems). These models provide a standardized vocabulary for planning and implementation.

### Files Overview

#### 1. HUMMBL_BASE120_DEFINITIVE_REFERENCE.md
**Purpose**: Authoritative list of all 120 models
**Use when**: You need to look up exact model names, codes, or definitions
**Contains**:
- All 120 models organized by transformation (P, IN, CO, DE, RE, SY)
- Model codes (e.g., P1, IN15, CO7)
- One-line definitions
- Usage guidelines and validation checklist

**Quick lookup**:
- Perspective models (P1-P20): Framing, viewpoints, context
- Inversion models (IN1-IN20): Reversals, opposites, edge cases
- Composition models (CO1-CO20): Combining parts into wholes
- Decomposition models (DE1-DE20): Breaking down complexity
- Recursion models (RE1-RE20): Iterative improvement, feedback loops
- Meta-Systems models (SY1-SY20): System dynamics, leverage points

#### 2. HUMMBL_BASE120_CLAUDE_CODE_APPLICATION.md
**Purpose**: Comprehensive guide for applying Base120 to Claude Code workflows
**Use when**: Planning how to approach complex tasks, designing new workflows
**Contains**:
- Detailed workflow phase mapping (Request → Plan → Implement → Test → Complete)
- Model application by task type (feature, bug fix, refactoring, etc.)
- Anti-patterns to avoid
- Decision trees for model selection
- Integration with existing Claude Code patterns
- Advanced patterns for complex scenarios

**Best for**: Deep dives, learning the framework, architecting workflows

#### 3. HUMMBL_BASE120_QUICK_REFERENCE.md
**Purpose**: Fast lookup during active task execution
**Use when**: You're working on a task and need quick model selection guidance
**Contains**:
- 60-second pre-task checklist
- Task type → model mapping (one-page)
- Phase-based model selection
- Signal-based triggers (user says X → apply models Y)
- Critical anti-patterns
- Completion checklist
- Emergency "when stuck" protocols

**Best for**: Active task execution, quick decisions

#### 4. HUMMBL_BASE120_INTEGRATION_GUIDE.md
**Purpose**: Shows how Base120 enhances existing Claude Code infrastructure
**Use when**: Understanding how Base120 fits with skills, agents, commands
**Contains**:
- Integration with existing skills (backend-dev-guidelines, frontend-dev-guidelines, etc.)
- How agents apply Base120 internally
- Enhanced workflow patterns with before/after examples
- Progressive adoption strategy (Levels 1-4)
- Real-world examples
- Measurement & calibration guidance

**Best for**: Onboarding, integration planning, team adoption

---

## Usage Guide

### For New Users

**Start here**:
1. Read **Quick Reference** (5 minutes) - Focus on "Essential Pre-Task Checklist"
2. Try applying the Essential 10 models to your next task
3. When stuck, reference Quick Reference → "Emergency: When Stuck"

**After 1 week**:
4. Read **Integration Guide** → "Progressive Adoption Strategy"
5. Review **Application Guide** → Task type sections relevant to your work

**After 1 month**:
6. Read **Definitive Reference** to understand full framework
7. Use **Application Guide** for complex or novel tasks

### For Experienced Users

**Daily**: Keep Quick Reference open during task execution
**Weekly**: Review which models were most valuable (apply RE11 - Calibration Loops)
**Monthly**: Apply RE3 (Meta-Learning) - how can you improve model usage?

### For Teams

1. Start with **Integration Guide** to understand how Base120 fits your existing workflows
2. Use **Application Guide** to establish team standards for common tasks
3. Reference **Definitive Reference** to ensure consistent vocabulary
4. Track adoption using metrics from **Integration Guide** → "Measurement & Validation"

---

## Quick Start Examples

### Example 1: User requests a new feature

**Apply these 5 models first** (from Quick Reference):
1. **P6** - Whose perspective? (end user, developer, system)
2. **P10** - What's in/out of scope?
3. **P15** - What am I assuming?
4. **DE11** - Precise boundaries
5. **DE8** - Break into tasks (TodoWrite)

### Example 2: Debugging an issue

**Apply these models** (from Quick Reference → "Bug Fix"):
1. **P10** - Define reproduction scope
2. **DE1** - 5 Whys to root cause
3. **DE14** - Isolate the variable
4. **IN7** - Test edge cases
5. **DE13** - Check for similar failures

### Example 3: Planning a refactoring

**Apply these models** (from Quick Reference → "Refactoring"):
1. **IN1** - What can we REMOVE?
2. **CO8** - Better layer separation?
3. **DE3** - Better module boundaries?
4. **RE19** - Maintain behavior, improve structure

---

## File Sizes & Load Times

- **Definitive Reference**: ~15 KB, ~5 min read
- **Application Guide**: ~35 KB, ~20 min read
- **Quick Reference**: ~10 KB, ~3 min scan
- **Integration Guide**: ~25 KB, ~15 min read

**Recommendation**: Keep Quick Reference open during work. Reference others as needed.

---

## Integration with Other Resources

### Skills
Base120 enhances these skills:
- `backend-dev-guidelines`: Models for layered architecture, error handling
- `frontend-dev-guidelines`: Models for component design, performance
- `error-tracking`: Models for telemetry, root cause analysis
- `route-tester`: Models for boundary testing, integration testing
- `skill-developer`: Models for meta-thinking about skill design

### Agents
Agents apply Base120 models internally:
- `code-refactor-master`: IN1, CO8, DE3, RE19
- `code-architecture-reviewer`: P1, IN2, IN4, CO8
- `refactor-planner`: DE8, IN2, SY1, DE19
- `Explore`: P4, P7, CO18, DE6

### Commands
Commands can be enhanced with Base120:
- `/dev-docs`: Apply P1, DE8, IN2, SY1 when planning
- `/dev-docs-update`: Apply P12, P2, CO8, P8 when documenting

---

## Validation

Before using Base120 references, verify:
- [ ] Model codes match pattern: [P|IN|CO|DE|RE|SY][1-20]
- [ ] Model names match exactly (no generic substitutions)
- [ ] Using models from correct transformation category
- [ ] No placeholder models (OODA, Hanlon's, Occam's, etc.)

---

## Source & Attribution

**Framework**: HUMMBL Base120
**Author**: Reuben Bowlby <rpbowlby@gmail.com>
**Created**: October 16, 2025
**Source**: [Google Drive Document](https://docs.google.com/document/d/1yZd1CxU1ZzJjv-MBoxyc3VOD_0-IOfVK8LHL_5qr2EM/edit)
**Version**: 1.0-beta
**Status**: Production

---

## Version History

| Date | Change | Files |
|------|--------|-------|
| 2025-11-13 | Initial Base120 integration | All 4 Base120 files created |

---

## Questions?

- **What is Base120?** → Read Integration Guide → "Overview"
- **How do I start?** → Read Quick Reference → "Essential Pre-Task Checklist"
- **Which models apply to X?** → Read Quick Reference → "Task Type → Model Mapping"
- **How does this fit with existing tools?** → Read Integration Guide → "Integration with Existing Infrastructure"
- **What's the full framework?** → Read Definitive Reference

---

**Next Steps**:
1. Open `HUMMBL_BASE120_QUICK_REFERENCE.md`
2. Read the "Essential Pre-Task Checklist" (60 seconds)
3. Apply to your next task
4. Track what helps (apply RE11 - Calibration Loops)
