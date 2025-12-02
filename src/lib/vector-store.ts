import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import path from "path";
import fs from "fs";

class MockEmbeddings extends Embeddings {
    constructor() {
        super({});
    }
    async embedDocuments(documents: string[]): Promise<number[][]> {
        return documents.map(() => new Array(384).fill(0)); // Mock 384-dim vector
    }
    async embedQuery(document: string): Promise<number[]> {
        return new Array(384).fill(0);
    }
}

const VECTOR_STORE_PATH = path.join(process.cwd(), "data", "vector_store");

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
    fs.mkdirSync(path.join(process.cwd(), "data"));
}

export async function getVectorStore() {
    const embeddings = new MockEmbeddings();

    if (fs.existsSync(VECTOR_STORE_PATH)) {
        return HNSWLib.load(VECTOR_STORE_PATH, embeddings);
    } else {
        // Return a new empty store (or handle initialization elsewhere)
        // HNSWLib.fromTexts requires at least one text to initialize.
        // So we'll just return null or throw if not initialized, 
        // or initialize with a dummy document.
        return HNSWLib.fromTexts(["Initial document"], [{ id: 1 }], embeddings);
    }
}

export async function createVectorStoreFromDocs(docs: Document[]) {
    const embeddings = new MockEmbeddings();

    const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    await vectorStore.save(VECTOR_STORE_PATH);
    return vectorStore;
}
