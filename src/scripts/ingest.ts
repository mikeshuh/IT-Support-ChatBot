import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createVectorStoreFromDocs } from "../lib/vector-store";
import { Document } from "@langchain/core/documents";
import path from "path";
import fs from "fs";

async function run() {
    try {
        const filePath = path.join(process.cwd(), "docs", "it-policy.txt");
        const text = fs.readFileSync(filePath, "utf-8");
        const docs = [new Document({ pageContent: text, metadata: { source: filePath } })];

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50,
        });

        const splitDocs = await splitter.splitDocuments(docs);

        console.log(`Ingesting ${splitDocs.length} documents...`);
        await createVectorStoreFromDocs(splitDocs);
        console.log("Ingestion complete!");
    } catch (error) {
        console.error("Ingestion failed:", error);
        process.exit(1);
    }
}

run();
