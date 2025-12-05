import { pool } from "./db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export class PGVectorStore {
    private tableName: string;

    constructor(tableName: string = "embeddings") {
        this.tableName = tableName;
    }

    async init() {
        const client = await pool.connect();
        try {
            // Enable pgvector extension
            await client.query("CREATE EXTENSION IF NOT EXISTS vector");

            // Create table if not exists
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          content TEXT,
          metadata JSONB,
          embedding vector(768)
        )
      `);

            // Create HNSW index for faster search
            await client.query(`
        CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx 
        ON ${this.tableName} 
        USING hnsw (embedding vector_cosine_ops)
      `);
        } finally {
            client.release();
        }
    }

    async addDocuments(documents: { pageContent: string; metadata: any }[]) {
        const client = await pool.connect();
        try {
            const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });

            for (const doc of documents) {
                const result = await model.embedContent(doc.pageContent);
                const embedding = result.embedding.values;
                const embeddingString = `[${embedding.join(",")}]`;

                await client.query(
                    `INSERT INTO ${this.tableName} (content, metadata, embedding) VALUES ($1, $2, $3)`,
                    [doc.pageContent, doc.metadata, embeddingString]
                );
            }
        } finally {
            client.release();
        }
    }

    async similaritySearch(query: string, k: number = 3) {
        const client = await pool.connect();
        try {
            const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(query);
            const embedding = result.embedding.values;
            const embeddingString = `[${embedding.join(",")}]`;

            const { rows } = await client.query(
                `SELECT content, metadata, 1 - (embedding <=> $1) as similarity 
         FROM ${this.tableName} 
         ORDER BY embedding <=> $1 
         LIMIT $2`,
                [embeddingString, k]
            );

            return rows.map(row => ({
                pageContent: row.content,
                metadata: row.metadata,
                similarity: row.similarity
            }));
        } finally {
            client.release();
        }
    }
}

export const vectorStore = new PGVectorStore();
