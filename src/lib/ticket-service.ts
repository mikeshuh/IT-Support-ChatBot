import { pool } from "./db";

// Direct database operations for ticket management
// This serves as an alternative to MCP when running in the same process

export interface Ticket {
    id: number;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "critical";
    category: "hardware" | "software" | "network" | "access" | "other";
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTicketParams {
    title: string;
    description: string;
    priority?: "low" | "medium" | "high" | "critical";
    category?: "hardware" | "software" | "network" | "access" | "other";
}

// Ensure tickets table exists
async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'other',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
    // Add updated_at column if it doesn't exist (for older tables)
    await pool.query(`
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
}

// Create a new ticket
export async function createTicket(params: CreateTicketParams): Promise<Ticket> {
    await ensureTable();

    const { title, description, priority = "medium", category = "other" } = params;

    const result = await pool.query(
        `INSERT INTO tickets (title, description, priority, category) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, title, description, status, priority, category, created_at, updated_at`,
        [title, description, priority, category]
    );

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Get a ticket by ID
export async function getTicket(ticketId: number): Promise<Ticket | null> {
    await ensureTable();

    const result = await pool.query(
        `SELECT id, title, description, status, priority, category, created_at, updated_at 
         FROM tickets WHERE id = $1`,
        [ticketId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// List tickets with optional filters
export async function listTickets(
    status?: "open" | "in_progress" | "resolved" | "closed" | "all",
    limit: number = 10
): Promise<Ticket[]> {
    await ensureTable();

    let query = `SELECT id, title, description, status, priority, category, created_at, updated_at 
                 FROM tickets`;
    const params: (string | number)[] = [];

    if (status && status !== "all") {
        query += ` WHERE status = $1`;
        params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

// Update ticket status
export async function updateTicketStatus(
    ticketId: number,
    status: "open" | "in_progress" | "resolved" | "closed"
): Promise<Ticket | null> {
    await ensureTable();

    const result = await pool.query(
        `UPDATE tickets SET status = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, title, description, status, priority, category, created_at, updated_at`,
        [status, ticketId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Mock log analysis
export function analyzeSystemLogs(
    system: "vpn" | "email" | "network" | "authentication",
    timeRange: "1h" | "24h" | "7d" = "24h"
): { status: string; findings: string[] } {
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

    return mockResults[system];
}
