import { pool } from "@/lib/db";

export async function GET() {
    try {
        // Ensure table exists
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

        const result = await pool.query(`
            SELECT id, title, description, status, priority, category, created_at, updated_at 
            FROM tickets 
            ORDER BY created_at DESC 
            LIMIT 50
        `);

        return Response.json({
            success: true,
            tickets: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                status: row.status,
                priority: row.priority,
                category: row.category,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            })),
        });
    } catch (error) {
        console.error("Failed to fetch tickets:", error);
        return Response.json(
            { success: false, error: "Failed to fetch tickets" },
            { status: 500 }
        );
    }
}
