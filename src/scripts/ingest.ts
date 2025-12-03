import fs from "fs";
import path from "path";
import { vectorStore } from "@/lib/vector-store";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async function ingestDocs() {
    try {
        const filePath = path.join(process.cwd(), "docs", "it-policy.txt");
        const text = fs.readFileSync(filePath, "utf-8");

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50,
        });

        const docs = await splitter.createDocuments([text]);

        console.log(`Ingesting ${docs.length} documents...`);

        // Initialize vector store (create table/extension)
        await vectorStore.init();

        // Add documents
        await vectorStore.addDocuments(docs);

        console.log("Ingestion complete!");
    } catch (error) {
        console.error("Ingestion failed:", error);
    }
}

ingestDocs();
