import { vectorStore } from "@/lib/vector-store";

export async function getAnswer(query: string): Promise<string> {
    try {
        // Retrieve top 3 documents from Postgres vector store
        const results = await vectorStore.similaritySearch(query, 3);

        if (results.length === 0) {
            return "I couldn't find any information about that in my knowledge base.";
        }

        // Combine the content of the top results
        const context = results.map(doc => doc.pageContent).join("\n\n");
        return `Based on our IT policy:\n${context}`;
    } catch (error) {
        console.error("Knowledge Agent Error:", error);
        return "I'm having trouble accessing the knowledge base right now.";
    }
}
