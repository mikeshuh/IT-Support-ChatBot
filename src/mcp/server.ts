import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5433/it_support",
});

// Ensure tickets table exists
async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
}

// Create the MCP server
const server = new McpServer({
    name: "it-support-tickets",
    version: "1.0.0",
});

// Tool: Create a new ticket
server.tool(
    "create_ticket",
    "Create a new IT support ticket",
    {
        title: z.string().describe("Short title describing the issue"),
        description: z.string().describe("Detailed description of the problem"),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Priority level"),
        category: z.enum(["hardware", "software", "network", "access", "other"]).default("other").describe("Issue category"),
    },
    async ({ title, description, priority, category }) => {
        await ensureTable();

        const result = await pool.query(
            `INSERT INTO tickets (title, description, priority, category) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, title, status, priority, category, created_at`,
            [title, description, priority, category]
        );

        const ticket = result.rows[0];
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        ticket: {
                            id: ticket.id,
                            title: ticket.title,
                            status: ticket.status,
                            priority: ticket.priority,
                            category: ticket.category,
                            createdAt: ticket.created_at,
                        },
                        message: `Ticket #${ticket.id} created successfully`,
                    }),
                },
            ],
        };
    }
);

// Tool: Get a ticket by ID
server.tool(
    "get_ticket",
    "Retrieve details of a specific ticket by its ID",
    {
        ticketId: z.number().describe("The ticket ID to look up"),
    },
    async ({ ticketId }) => {
        await ensureTable();

        const result = await pool.query(
            `SELECT id, title, description, status, priority, category, created_at, updated_at 
             FROM tickets WHERE id = $1`,
            [ticketId]
        );

        if (result.rows.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Ticket #${ticketId} not found`,
                        }),
                    },
                ],
            };
        }

        const ticket = result.rows[0];
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        ticket: {
                            id: ticket.id,
                            title: ticket.title,
                            description: ticket.description,
                            status: ticket.status,
                            priority: ticket.priority,
                            category: ticket.category,
                            createdAt: ticket.created_at,
                            updatedAt: ticket.updated_at,
                        },
                    }),
                },
            ],
        };
    }
);

// Tool: List tickets with optional filters
server.tool(
    "list_tickets",
    "List all tickets, optionally filtered by status",
    {
        status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).default("all").describe("Filter by ticket status"),
        limit: z.number().default(10).describe("Maximum number of tickets to return"),
    },
    async ({ status, limit }) => {
        await ensureTable();

        let query = `SELECT id, title, status, priority, category, created_at 
                     FROM tickets`;
        const params: any[] = [];

        if (status !== "all") {
            query += ` WHERE status = $1`;
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        count: result.rows.length,
                        tickets: result.rows.map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            priority: t.priority,
                            category: t.category,
                            createdAt: t.created_at,
                        })),
                    }),
                },
            ],
        };
    }
);

// Tool: Update ticket status
server.tool(
    "update_ticket_status",
    "Update the status of an existing ticket",
    {
        ticketId: z.number().describe("The ticket ID to update"),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).describe("New status"),
    },
    async ({ ticketId, status }) => {
        await ensureTable();

        const result = await pool.query(
            `UPDATE tickets SET status = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, title, status, updated_at`,
            [status, ticketId]
        );

        if (result.rows.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Ticket #${ticketId} not found`,
                        }),
                    },
                ],
            };
        }

        const ticket = result.rows[0];
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Ticket #${ticket.id} status updated to "${status}"`,
                        ticket: {
                            id: ticket.id,
                            title: ticket.title,
                            status: ticket.status,
                            updatedAt: ticket.updated_at,
                        },
                    }),
                },
            ],
        };
    }
);

// Tool: Analyze system logs (mock)
server.tool(
    "analyze_logs",
    "Analyze system or application logs for diagnostics",
    {
        system: z.enum(["vpn", "email", "network", "authentication"]).describe("System to analyze logs for"),
        timeRange: z.enum(["1h", "24h", "7d"]).default("24h").describe("Time range for log analysis"),
    },
    async ({ system, timeRange }) => {
        // Mock log analysis - in production this would connect to actual log systems
        const mockResults: Record<string, { status: string; findings: string[] }> = {
            vpn: {
                status: "healthy",
                findings: [
                    "No connection failures detected in the last 24 hours",
                    "Average connection time: 2.3 seconds",
                    "98.5% uptime maintained",
                ],
            },
            email: {
                status: "warning",
                findings: [
                    "3 delivery delays detected (avg 45 seconds)",
                    "Spam filter blocked 127 messages",
                    "All mailbox sync operations successful",
                ],
            },
            network: {
                status: "healthy",
                findings: [
                    "Bandwidth utilization at 45%",
                    "No packet loss detected",
                    "DNS resolution time: 12ms average",
                ],
            },
            authentication: {
                status: "healthy",
                findings: [
                    "2 failed login attempts detected (normal range)",
                    "SSO token refresh working correctly",
                    "MFA adoption rate: 94%",
                ],
            },
        };

        const analysis = mockResults[system];

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        system,
                        timeRange,
                        status: analysis.status,
                        findings: analysis.findings,
                        analyzedAt: new Date().toISOString(),
                    }),
                },
            ],
        };
    }
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("IT Support MCP Server running on stdio");
}

main().catch(console.error);
