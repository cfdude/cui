# 🔴 GLOBAL CONFIGURATION - MANDATORY LOADING INSTRUCTIONS

**CRITICAL**: This project uses a global CLAUDE.md configuration file that **MUST** be loaded at specific times.

## When to Load Global Configuration

### 1. On Session Start
**IMMEDIATELY** when starting any new session in this project, read the global configuration file:
- **File Path**: `~/.claude/CLAUDE.md`
- **Action**: Read the entire file to load global operating principles, quality standards, and technical requirements

### 2. After Conversation Compaction
**EVERY TIME** the conversation is compacted or summarized, **re-read** the global configuration file:
- **File Path**: `~/.claude/CLAUDE.md`
- **Action**: Re-read the entire file to restore global context that may have been lost during compaction

## Why This Matters

The global configuration contains core operating principles, quality standards, tool usage policies, and technical requirements that apply to **ALL** projects. Information from this document often gets lost during conversation compaction, requiring explicit re-reading to maintain consistency.

---

# PROJECT-SPECIFIC CONFIGURATION

# Testing Architecture

This directory contains comprehensive test coverage for CUI services.

## Testing Philosophy

- **Prefer real implementations** over mocks when testing (per project guidelines)
- **Comprehensive unit test coverage** for all services (90%+ target)
- **Mock Claude CLI** using `tests/__mocks__/claude` script for consistent testing
- **Silent logging** in tests (LOG_LEVEL=silent) to reduce noise

## Test Structure

```
tests/
├── __mocks__
│   └── claude
├── integration
│   ├── conversation-status-integration.test.ts
│   ├── real-claude-integration.test.ts
│   └── streaming-integration.test.ts
├── setup.ts
├── unit
│   ├── cui-server.test.ts
│   ├── claude-history-reader.test.ts
│   ├── claude-process-long-running.test.ts
│   ├── claude-process-manager.test.ts
│   ├── cli
│   │   ├── get.test.ts
│   │   ├── list.test.ts
│   │   ├── serve.test.ts
│   │   ├── status-simple.test.ts
│   │   ├── status-working.test.ts
│   │   └── status.test.ts
│   ├── conversation-status-tracker.test.ts
│   ├── json-lines-parser.test.ts
│   └── stream-manager.test.ts
└── utils
    └── test-helpers.ts
```

## Mock Claude CLI

The project includes a mock Claude CLI (`tests/__mocks__/claude`) that:
- Simulates real Claude CLI behavior for testing
- Outputs valid JSONL stream format
- Supports various command line arguments
- Enables testing without requiring actual Claude CLI installation

## Testing Patterns

```typescript
// Integration test pattern with mock Claude CLI
function getMockClaudeExecutablePath(): string {
  return path.join(process.cwd(), 'tests', '__mocks__', 'claude');
}

// Server setup with random port to avoid conflicts
const serverPort = 9000 + Math.floor(Math.random() * 1000);
const server = new CUIServer({ port: serverPort });

// Override ProcessManager with mock path
const mockClaudePath = getMockClaudeExecutablePath();
const { ClaudeProcessManager } = await import('@/services/claude-process-manager');
(server as any).processManager = new ClaudeProcessManager(mockClaudePath);
```

## Test Configuration

- **Vitest** for fast and modern testing with TypeScript support
- **Path mapping** using `@/` aliases matching source structure

## Test Commands

```bash
# Run specific test files
yarn test claude-process-manager.test.ts
yarn test tests/unit/

# Run tests matching a pattern
yarn test --testNamePattern="should start conversation"

# Run unit tests only
yarn unit-tests

# Run integration tests only
yarn integration-tests

# Run with coverage
yarn test:coverage
```

## Development Practices

- **Meaningful test names** and comprehensive test coverage
- **Silent logging** in tests (LOG_LEVEL=silent) to reduce noise
- **Random ports** for server tests to avoid conflicts
- **Proper cleanup** of resources and processes in tests