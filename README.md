# IT Support ChatBot

An AI-powered IT support system using multi-agent orchestration, RAG (Retrieval-Augmented Generation), and the Model Context Protocol (MCP) for intelligent ticket management and knowledge-based assistance.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![AI SDK](https://img.shields.io/badge/AI_SDK-Gemini-green)
![MCP](https://img.shields.io/badge/MCP-1.0-purple)

---

## Problem Definition

### User Pain Points
| Pain Point | Impact | Solution |
|------------|--------|----------|
| Long wait times for IT support | Productivity loss | Instant AI responses |
| Repetitive tickets (password resets, VPN help) | IT staff burnout | Automated workflows |
| Scattered documentation | User frustration | Unified RAG knowledge base |
| Lack of ticket visibility | Anxiety, duplicate tickets | Real-time ticket dashboard |

### Success Metrics
- **Response Latency:** < 2 seconds for initial response
- **Routing Accuracy:** > 95% correct agent classification  
- **Ticket Success Rate:** > 98% successful ticket creation
- **Self-Service Resolution:** > 60% resolved without human escalation

---

## Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│              (Next.js + TailwindCSS + Streaming SSE)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        INTAKE AGENT                              │
│         Classifies intent: knowledge | workflow | escalation     │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ KNOWLEDGE AGENT │ │ WORKFLOW AGENT  │ │ ESCALATION AGENT│
│                 │ │                 │ │                 │
│ • RAG retrieval │ │ • Ticket CRUD   │ │ • Human handoff │
│ • Policy lookup │ │ • Password reset│ │ • High-priority │
│ • How-to guides │ │ • Log analysis  │ │   ticket create │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│  PostgreSQL + pgvector | MCP Server | Metrics Tracking          │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Roles

| Agent | Responsibility | Technology |
|-------|---------------|------------|
| **Intake** | Intent classification (LLM-powered) | Gemini + Zod schema |
| **Knowledge** | RAG-based Q&A from IT policies | pgvector + embeddings |
| **Workflow** | Execute actions (tickets, password reset) | MCP tools |
| **Escalation** | Route to human support | Priority ticket creation |

---

## Features

### Core Capabilities
- ✅ **Multi-Agent Orchestration** - Specialized agents for different tasks
- ✅ **RAG Knowledge Base** - Semantic search over IT policies
- ✅ **Workflow Automation** - Ticket creation, password reset, log analysis
- ✅ **MCP Integration** - Standardized tool protocol for extensibility
- ✅ **Real-time Streaming** - SSE-based response streaming with agent status
- ✅ **Metrics Tracking** - Latency, accuracy, and success rate monitoring

### User Experience
- ✅ Dark/Light mode toggle
- ✅ Quick action buttons
- ✅ Animated agent status indicators
- ✅ Ticket dashboard with statistics
- ✅ Mobile-responsive design

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Google AI API key

### Installation

```bash
# Clone and install
git clone <repository>
cd IT-Support-ChatBot
npm install

# Configure environment
echo "GOOGLE_GENERATIVE_AI_API_KEY=your-key-here" > .env

# Start database
docker-compose up db -d

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Full Docker Deployment

```bash
# Set API key and run all services
export GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
docker-compose up --build
```

---

## Project Structure

```
src/
├── agents/
│   ├── intake/agent.ts      # Intent classification
│   ├── knowledge/agent.ts   # RAG retrieval
│   ├── workflow/agent.ts    # Action execution
│   └── escalation/agent.ts  # Human handoff
├── app/
│   ├── api/
│   │   ├── chat/route.ts    # Main chat endpoint (SSE)
│   │   └── tickets/route.ts # Ticket listing API
│   ├── tickets/page.tsx     # Ticket dashboard
│   └── page.tsx             # Main chat interface
├── lib/
│   ├── vector-store.ts      # pgvector integration
│   ├── ticket-service.ts    # Direct DB operations
│   ├── metrics.ts           # Performance tracking
│   └── db.ts               # Database connection
├── mcp/
│   └── server.ts            # MCP tool server
└── tests/                   # Vitest test suite
```

---

## Testing

### Run Test Suite

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage (30 tests)
- `intake.test.ts` - Intent classification (8 tests)
- `knowledge.test.ts` - RAG retrieval (6 tests)
- `workflow.test.ts` - Action execution (10 tests)
- `scenarios.test.ts` - End-to-end flows (6 tests)

---

## MCP Server

The Model Context Protocol server exposes 5 tools:

| Tool | Description |
|------|-------------|
| `create_ticket` | Create new IT support ticket |
| `get_ticket` | Retrieve ticket by ID |
| `list_tickets` | List tickets with filters |
| `update_ticket_status` | Update ticket status |
| `analyze_logs` | Analyze system logs (VPN, email, etc.) |

### Run MCP Server

```bash
npm run mcp:server
```

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes (default provided) |

---

## Metrics & Validation

The system tracks key performance indicators:

```typescript
interface MetricsSummary {
  totalRequests: number;
  averageLatencyMs: number;
  routingAccuracy: number;      // Intent classification accuracy
  ticketSuccessRate: number;    // Ticket creation success
  retrievalHitRate: number;     // RAG hit rate
  errorRate: number;
}
```

Access via the `/api/metrics` endpoint (when available).

---

## Documentation

- [Vendor Research](docs/VENDOR_RESEARCH.md) - ServiceNow & Zendesk comparison
- [IT Policy](docs/it-policy.txt) - Knowledge base source document

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4 |
| **AI/ML** | Gemini 2.5 Flash, Google text-embedding-004 |
| **Database** | PostgreSQL 16 + pgvector |
| **Protocol** | Model Context Protocol (MCP) |
| **Testing** | Vitest, Testing Library |
| **Deployment** | Docker, Docker Compose |

---

## License

MIT
