# Testing Strategy

This document outlines the comprehensive testing strategy for the IT Support ChatBot, covering both automated unit/integration tests and end-to-end usability testing.

## Overview

The testing approach follows a **multi-layered strategy**:

| Layer | Type | Purpose |
|-------|------|---------|
| **Unit Tests** | Vitest | Test individual agent functions in isolation |
| **Integration Tests** | Vitest | Test agent interactions and full flows |
| **E2E Usability Tests** | Manual/Browser | Validate real user experience |

---

## Automated Testing (Vitest)

### Configuration

Tests are configured in `vitest.config.ts`:
- **Environment**: Node.js
- **Setup File**: `src/tests/setup.ts` for global mocks
- **Path Aliases**: `@/` maps to `src/`

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx vitest src/tests/intake.test.ts
```

---

## Test Suites

### 1. Intake Agent Tests (`intake.test.ts`)

Tests the request classification system that routes user queries to the correct agent.

**Coverage:**
- LLM-based intent classification (knowledge, workflow, escalation)
- Fallback keyword matching when LLM fails
- Edge cases and error handling

**Test Cases:**
| Test | Input | Expected Output |
|------|-------|-----------------|
| Password reset | "I need to reset my password" | `knowledge` |
| VPN question | "How do I connect to the VPN?" | `knowledge` |
| Human request | "I want to speak to a human agent" | `escalation` |
| Ticket request | "My monitor is broken, create a ticket" | `workflow` |
| LLM failure | Any query (API error) | Keyword-based fallback |

---

### 2. Knowledge Agent Tests (`knowledge.test.ts`)

Tests the RAG (Retrieval-Augmented Generation) system that answers questions from the IT policy knowledge base.

**Coverage:**
- Vector similarity search
- Context concatenation from multiple documents
- Fallback when no documents found
- Various query types (VPN, WiFi, escalation matrix)

**Test Cases:**
| Test | Documents Found | Expected Behavior |
|------|-----------------|-------------------|
| Successful retrieval | 2+ docs | Answer includes context content |
| Multiple contexts | 3 docs | All contexts concatenated |
| No results | 0 docs | Returns "couldn't find" message |
| VPN queries | 1 doc | Returns VPN-specific info |
| WiFi queries | 1 doc | Returns WiFi network info |

---

### 3. Workflow Agent Tests (`workflow.test.ts`)

Tests the workflow execution system for ticket operations and system actions.

**Coverage:**
- Ticket creation with parameter extraction
- Ticket status checking (found, not found, missing ID)
- Ticket listing with filters
- Log analysis for different systems
- Fallback behavior when LLM fails

**Test Cases:**
| Action | Test Scenario | Expected Result |
|--------|---------------|-----------------|
| `create_ticket` | Hardware issue | Ticket created with ID |
| `check_status` | Valid ticket ID | Ticket details returned |
| `check_status` | Invalid ticket ID | Error message |
| `check_status` | No ID provided | Asks for ticket number |
| `list_tickets` | Open tickets | List with ticket IDs |
| `list_tickets` | No tickets | "No tickets" message |
| `analyze_logs` | VPN system | Health status + findings |
| `analyze_logs` | No system specified | Asks which system |

---

### 4. End-to-End Scenario Tests (`scenarios.test.ts`)

Tests complete user flows from input to final response, validating the full multi-agent orchestration.

**Coverage:**
- Complete password reset flow (classify → execute → respond)
- VPN troubleshooting with knowledge retrieval
- Hardware ticket creation flow
- Ticket status check flow
- Human escalation with ticket creation
- Ticket listing flow

**Scenarios:**

1. **Password Reset Flow**
   - User: "I need to reset my password"
   - Intake → `workflow` → Execute password reset → Return instructions

2. **VPN Troubleshooting Flow**
   - User: "How do I connect to the VPN?"
   - Intake → `knowledge` → RAG search → Return answer with steps

3. **Hardware Ticket Creation**
   - User: "My monitor is not turning on"
   - Intake → `workflow` → Create ticket → Return confirmation

4. **Ticket Status Check**
   - User: "What's the status of ticket #100?"
   - Intake → `workflow` → Fetch ticket → Return status

5. **Human Escalation**
   - User: "This is too complicated, I need to talk to someone"
   - Intake → `escalation` → Create high-priority ticket → Connect to agent

6. **List Open Tickets**
   - User: "Show all my open tickets"
   - Intake → `workflow` → List tickets → Display results

---

## Mocking Strategy

All tests use **dependency mocking** to isolate components:

```typescript
// Mock AI SDK
vi.mock('ai', () => ({
    generateObject: vi.fn(),
    generateText: vi.fn(),
}));

// Mock vector store
vi.mock('@/lib/vector-store', () => ({
    vectorStore: {
        similaritySearch: vi.fn(),
    },
}));

// Mock ticket service
vi.mock('@/lib/ticket-service', () => ({
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    listTickets: vi.fn(),
    analyzeSystemLogs: vi.fn(),
}));
```

---

## End-to-End Usability Testing

### Manual Testing Checklist

#### Chat Interface Tests
- [ ] Page loads at `http://localhost:3000`
- [ ] Chat input accepts text and submits on Enter
- [ ] Quick action buttons work correctly
- [ ] Agent status indicators show during processing
- [ ] Responses stream in real-time
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive layout works

#### Knowledge Retrieval Tests
| Query | Expected Response Contains |
|-------|---------------------------|
| "How do I reset my password?" | password.example.com, steps |
| "What is the VPN server?" | vpn.example.com |
| "What are the password requirements?" | 12 characters, uppercase, etc. |
| "How do I connect to WiFi?" | CorpNet-Secure SSID |

#### Workflow Tests
| Query | Expected Behavior |
|-------|-------------------|
| "My laptop is broken" | Creates ticket, returns ID |
| "Check status of ticket #5" | Returns ticket details |
| "List my open tickets" | Shows ticket list |
| "Close ticket #3" | Updates status to closed |

#### Tickets Dashboard Tests
- [ ] Navigate to `/tickets`
- [ ] Dashboard shows correct stats (Total, Open, In Progress, Resolved, Closed)
- [ ] Ticket list displays correctly
- [ ] Status badges show correct colors
- [ ] Refresh button works
- [ ] Back to chat link works

---

## Test Coverage Goals

| Area | Target Coverage |
|------|-----------------|
| Intake Agent | 90%+ |
| Knowledge Agent | 85%+ |
| Workflow Agent | 85%+ |
| Escalation Agent | 80%+ |
| API Routes | 70%+ |

---

## CI/CD Integration

For continuous integration, tests can be run as:

```bash
# In CI pipeline
npm ci
npm test -- --run

# With coverage report
npm run test:coverage
```

Add to GitHub Actions or similar:

```yaml
- name: Run Tests
  run: npm test -- --run
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```
