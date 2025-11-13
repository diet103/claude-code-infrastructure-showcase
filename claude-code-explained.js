/**
 * CLAUDE CODE EXPLAINED WITH CODE
 *
 * Claude Code is an AI-powered coding assistant that runs in your terminal
 * and helps with software engineering tasks through natural language.
 *
 * This file demonstrates Claude Code's capabilities through practical examples.
 */

// ============================================================================
// 1. WHAT IS CLAUDE CODE?
// ============================================================================

/**
 * Claude Code is a CLI tool that:
 * - Reads and writes files in your codebase
 * - Executes commands (npm, git, etc.)
 * - Understands context across multiple files
 * - Makes intelligent code changes
 * - Follows project patterns and best practices
 */

class ClaudeCodeCapabilities {
  // Claude Code can read your entire codebase
  async readCode() {
    // Example: "Show me all React components"
    // Claude searches files, understands structure
    return {
      tool: 'Read',
      action: 'Reads files with line numbers',
      example: 'Read src/components/Button.tsx'
    };
  }

  // Claude Code can write and edit files
  async editCode() {
    // Example: "Add error handling to this function"
    // Claude makes precise edits preserving your style
    return {
      tool: 'Edit',
      action: 'Makes exact string replacements',
      example: 'Replace old code with new code'
    };
  }

  // Claude Code can execute commands
  async runCommands() {
    // Example: "Run the tests"
    // Claude executes bash commands and interprets results
    return {
      tool: 'Bash',
      action: 'Runs terminal commands',
      example: 'npm test, git status, etc.'
    };
  }

  // Claude Code can search your codebase
  async searchCode() {
    // Example: "Find all API endpoints"
    // Claude uses grep/glob to find patterns
    return {
      tool: 'Grep',
      action: 'Searches code with regex',
      example: 'Find all functions named "handle*"'
    };
  }
}

// ============================================================================
// 2. HOW CLAUDE CODE WORKS
// ============================================================================

/**
 * The Claude Code Workflow:
 * 1. You describe what you want in natural language
 * 2. Claude analyzes your request
 * 3. Claude explores your codebase
 * 4. Claude makes changes using tools
 * 5. You review and approve
 */

class ClaudeCodeWorkflow {
  constructor() {
    this.tools = [
      'Read',      // Read file contents
      'Write',     // Create new files
      'Edit',      // Modify existing files
      'Bash',      // Run commands
      'Grep',      // Search code
      'Glob',      // Find files by pattern
      'Task',      // Launch specialized agents
    ];
  }

  // Example conversation flow
  async exampleConversation() {
    const conversation = [
      {
        user: "Add a validateEmail function to utils.js",
        claude: [
          "1. Read utils.js to see existing code",
          "2. Understand the project's coding style",
          "3. Write the new function following patterns",
          "4. Edit the file with the new code"
        ]
      },
      {
        user: "Write tests for it",
        claude: [
          "1. Find the test file location",
          "2. Read existing tests to match style",
          "3. Write comprehensive test cases",
          "4. Run tests to verify they work"
        ]
      },
      {
        user: "Commit these changes",
        claude: [
          "1. Run git status to see changes",
          "2. Run git diff to review changes",
          "3. Stage files with git add",
          "4. Commit with descriptive message"
        ]
      }
    ];

    return conversation;
  }
}

// ============================================================================
// 3. ADVANCED FEATURES
// ============================================================================

/**
 * Skills: Reusable prompts for specific tasks
 * Located in: .claude/skills/
 */
class ClaudeCodeSkills {
  // Example skill structure
  backendDevGuidelines = {
    trigger: 'When creating routes, controllers, services',
    provides: 'Backend development best practices',
    location: '.claude/skills/backend-dev-guidelines/'
  };

  frontendDevGuidelines = {
    trigger: 'When creating React components',
    provides: 'Frontend development patterns',
    location: '.claude/skills/frontend-dev-guidelines/'
  };

  // Skills automatically activate based on context
  automaticActivation() {
    return {
      example: "User: 'Create a new API endpoint'",
      result: "backend-dev-guidelines skill activates",
      benefit: "Claude follows your project's patterns"
    };
  }
}

/**
 * Agents: Specialized workers for complex tasks
 * Launched with the Task tool
 */
class ClaudeCodeAgents {
  agents = {
    'Explore': 'Fast codebase exploration',
    'code-refactor-master': 'Refactor code structure',
    'frontend-error-fixer': 'Fix React/TypeScript errors',
    'auth-route-debugger': 'Debug authentication issues',
    'documentation-architect': 'Create documentation',
  };

  // Agents work autonomously
  async launchAgent(type, task) {
    return {
      action: 'Agent explores codebase independently',
      tools: 'Access to Read, Grep, Bash, etc.',
      result: 'Returns comprehensive findings',
      example: `Task(subagent_type="${type}", prompt="${task}")`
    };
  }
}

/**
 * Slash Commands: Custom shortcuts
 * Located in: .claude/commands/
 */
class ClaudeCodeCommands {
  // Example: /dev-docs command
  devDocs = {
    file: '.claude/commands/dev-docs.md',
    usage: '/dev-docs',
    expands: 'Full prompt for creating strategic plans',
    benefit: 'Reusable workflows'
  };

  // Create custom commands for your workflow
  customCommand = {
    example: '/deploy-staging',
    contains: 'Multi-step deployment instructions',
    advantage: 'Consistency across deployments'
  };
}

// ============================================================================
// 4. INTEGRATION WITH YOUR PROJECT
// ============================================================================

/**
 * Project Context: Claude understands your architecture
 */
class ProjectIntegration {
  // Claude reads your dev documentation
  devDocs = {
    location: '.claude/dev-docs/',
    contains: [
      'Architecture patterns',
      'Coding standards',
      'Testing strategies',
      'Deployment procedures'
    ],
    benefit: 'Claude follows your team standards'
  };

  // Session hooks customize behavior
  sessionHooks = {
    'SessionStart.sh': 'Runs when Claude Code starts',
    example: 'npm install, git fetch, etc.',
    benefit: 'Ensures environment is ready'
  };

  // Memory system tracks work
  memory = {
    location: '.claude/memory/',
    tracks: [
      'Recent changes',
      'Important decisions',
      'Project context',
      'Code patterns'
    ],
    benefit: 'Claude remembers context across sessions'
  };
}

// ============================================================================
// 5. REAL-WORLD EXAMPLES
// ============================================================================

/**
 * Example 1: Building a feature
 */
async function buildFeatureExample() {
  const steps = [
    {
      userRequest: "Add user authentication to the app",
      claudeActions: [
        "Reads existing auth patterns in codebase",
        "Creates auth service following project structure",
        "Adds middleware for protected routes",
        "Writes comprehensive tests",
        "Updates documentation",
        "Commits changes with clear message"
      ]
    }
  ];
  return steps;
}

/**
 * Example 2: Debugging
 */
async function debuggingExample() {
  const steps = [
    {
      userRequest: "Tests are failing, help me debug",
      claudeActions: [
        "Runs test suite to see failures",
        "Reads test output and error messages",
        "Analyzes source code for issues",
        "Identifies root cause",
        "Fixes the bug",
        "Verifies tests pass"
      ]
    }
  ];
  return steps;
}

/**
 * Example 3: Refactoring
 */
async function refactoringExample() {
  const steps = [
    {
      userRequest: "Refactor this component to use hooks",
      claudeActions: [
        "Reads current class component",
        "Identifies state and lifecycle methods",
        "Converts to functional component",
        "Replaces with appropriate hooks",
        "Maintains all functionality",
        "Updates tests if needed"
      ]
    }
  ];
  return steps;
}

// ============================================================================
// 6. KEY PRINCIPLES
// ============================================================================

/**
 * How Claude Code makes decisions
 */
class ClaudeCodePrinciples {
  principles = {
    contextAware: "Reads multiple files to understand the full picture",
    patternFollowing: "Matches your existing code style and architecture",
    safety: "Makes precise edits, doesn't break working code",
    transparency: "Shows exactly what it's doing with each tool",
    iterative: "Works step-by-step, checking results"
  };

  // Example: Making a safe edit
  safeEditExample() {
    return {
      step1: "Read the entire file first",
      step2: "Find exact string to replace",
      step3: "Make minimal, precise change",
      step4: "Preserve formatting and style",
      result: "Surgical edits, not file rewrites"
    };
  }
}

// ============================================================================
// 7. THE TECHNOLOGY STACK
// ============================================================================

/**
 * What powers Claude Code
 */
class ClaudeCodeTechnology {
  ai = {
    model: "Claude Sonnet 4.5",
    provider: "Anthropic",
    capabilities: [
      "Natural language understanding",
      "Code comprehension",
      "Multi-file reasoning",
      "Tool orchestration"
    ]
  };

  tools = {
    fileOperations: ["Read", "Write", "Edit", "Glob"],
    search: ["Grep", "WebSearch"],
    execution: ["Bash"],
    specialized: ["Task (agents)", "TodoWrite (planning)"]
  };

  architecture = {
    interface: "CLI (Command Line Interface)",
    interaction: "Natural language prompts",
    feedback: "Real-time tool execution results",
    collaboration: "Human-in-the-loop for important decisions"
  };
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Claude Code in a nutshell:
 *
 * 1. AI-powered coding assistant in your terminal
 * 2. Understands your codebase through reading files
 * 3. Makes changes using precise editing tools
 * 4. Follows your project patterns and standards
 * 5. Extensible with skills, agents, and commands
 * 6. Works iteratively with human oversight
 *
 * Example interaction:
 *
 *   You:    "Add input validation to the signup form"
 *   Claude: [Reads form code, adds validation, writes tests]
 *   You:    "Make the error messages more user-friendly"
 *   Claude: [Updates error text following UX patterns]
 *   You:    "Looks good, commit it"
 *   Claude: [Creates commit with descriptive message]
 */

module.exports = {
  ClaudeCodeCapabilities,
  ClaudeCodeWorkflow,
  ClaudeCodeSkills,
  ClaudeCodeAgents,
  ClaudeCodeCommands,
  ProjectIntegration,
  ClaudeCodePrinciples,
  ClaudeCodeTechnology
};

// Try Claude Code yourself:
// 1. Install: npm install -g claude-code (or use Claude on web)
// 2. Run: claude-code
// 3. Ask: "Explain this file" or "Add a feature" or "Fix this bug"
// 4. Watch Claude work through reading, editing, and testing
