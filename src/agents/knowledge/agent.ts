import { getVectorStore } from "@/lib/vector-store";

export async function getAnswer(query: string): Promise<string> {
    const vectorStore = await getVectorStore();

    // Retrieve top 3 documents
    const results = await vectorStore.similaritySearch(query, 3);

    if (results.length === 0) {
        return "I couldn't find any information about that in my knowledge base.";
    }

    // In a real app, we would pass these docs to an LLM to generate the answer.
    // For now, we'll return the content of the top result directly.
    const topDoc = results[0];
    return `Here is what I found: ${topDoc.pageContent}`;
}
