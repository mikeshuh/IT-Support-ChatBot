/**
 * Document Ingestion Script
 * 
 * Loads IT policy documents from the docs/ directory, splits them into chunks,
 * generates embeddings using Google text-embedding-004, and stores them in pgvector.
 * 
 * Usage: npx tsx src/scripts/ingest.ts
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
    console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
    process.exit(1);
}

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5433/it_support",
});

// Google AI client
const genAI = new GoogleGenerativeAI(apiKey);

interface DocumentChunk {
    content: string;
    metadata: {
        source: string;
        section?: string;
        chunkIndex: number;
    };
}

/**
 * Split document into chunks based on sections
 */
function splitDocument(content: string, source: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    // Split by numbered sections (e.g., "1. Password Management")
    const sections = content.split(/\n(?=\d+\.\s)/);

    sections.forEach((section, index) => {
        const trimmed = section.trim();
        if (trimmed.length < 10) return; // Skip empty sections

        // Extract section title
        const titleMatch = trimmed.match(/^\d+\.\s+(.+?)(?:\n|$)/);
        const sectionTitle = titleMatch ? titleMatch[1].trim() : undefined;

        // If section is too long, split into smaller chunks
        const maxChunkSize = 500;
        if (trimmed.length > maxChunkSize) {
            const lines = trimmed.split("\n");
            let currentChunk = "";
            let chunkCount = 0;

            for (const line of lines) {
                if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
                    chunks.push({
                        content: currentChunk.trim(),
                        metadata: {
                            source,
                            section: sectionTitle,
                            chunkIndex: chunkCount++,
                        },
                    });
                    currentChunk = "";
                }
                currentChunk += line + "\n";
            }

            if (currentChunk.trim().length > 0) {
                chunks.push({
                    content: currentChunk.trim(),
                    metadata: {
                        source,
                        section: sectionTitle,
                        chunkIndex: chunkCount,
                    },
                });
            }
        } else {
            chunks.push({
                content: trimmed,
                metadata: {
                    source,
                    section: sectionTitle,
                    chunkIndex: index,
                },
            });
        }
    });

    return chunks;
}

/**
 * Initialize the embeddings table
 */
async function initTable() {
    const client = await pool.connect();
    try {
        // Enable pgvector extension
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");

        // Create embeddings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS embeddings (
                id SERIAL PRIMARY KEY,
                content TEXT,
                metadata JSONB,
                embedding vector(768)
            )
        `);

        // Create index for fast similarity search
        await client.query(`
            CREATE INDEX IF NOT EXISTS embeddings_embedding_idx 
            ON embeddings 
            USING hnsw (embedding vector_cosine_ops)
        `);

        console.log("✅ Embeddings table initialized");
    } finally {
        client.release();
    }
}

/**
 * Generate embedding for a text chunk
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

/**
 * Store chunk with embedding in database
 */
async function storeChunk(chunk: DocumentChunk, embedding: number[]) {
    const client = await pool.connect();
    try {
        const embeddingString = `[${embedding.join(",")}]`;
        await client.query(
            `INSERT INTO embeddings (content, metadata, embedding) VALUES ($1, $2, $3)`,
            [chunk.content, chunk.metadata, embeddingString]
        );
    } finally {
        client.release();
    }
}

/**
 * Main ingestion function
 */
async function ingest() {
    console.log("🚀 Starting document ingestion...\n");

    // Initialize table
    await initTable();

    // Clear existing embeddings (optional, comment out to append)
    const client = await pool.connect();
    try {
        await client.query("DELETE FROM embeddings");
        console.log("🗑️  Cleared existing embeddings\n");
    } finally {
        client.release();
    }

    // Find all .txt files in docs/
    const docsDir = join(process.cwd(), "docs");
    const files = readdirSync(docsDir).filter(f => f.endsWith(".txt") || f.endsWith(".md"));

    console.log(`📁 Found ${files.length} document(s) to process\n`);

    let totalChunks = 0;

    for (const file of files) {
        // Skip vendor research (not for RAG)
        if (file === "VENDOR_RESEARCH.md") continue;

        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, "utf-8");

        console.log(`📄 Processing: ${file}`);

        // Split into chunks
        const chunks = splitDocument(content, file);
        console.log(`   → ${chunks.length} chunks created`);

        // Generate embeddings and store
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Rate limiting (Google AI has rate limits)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            try {
                const embedding = await generateEmbedding(chunk.content);
                await storeChunk(chunk, embedding);
                process.stdout.write(`\r   → Embedded ${i + 1}/${chunks.length} chunks`);
            } catch (error) {
                console.error(`\n   ⚠️  Error embedding chunk ${i}: ${error}`);
            }
        }

        console.log("\n");
        totalChunks += chunks.length;
    }

    console.log(`\n✅ Ingestion complete! ${totalChunks} chunks stored in vector database.`);

    // Close pool
    await pool.end();
}

// Run ingestion
ingest().catch(error => {
    console.error("❌ Ingestion failed:", error);
    process.exit(1);
});
