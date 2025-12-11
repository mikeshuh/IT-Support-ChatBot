import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { vectorStore } from "@/lib/vector-store";

export async function answerWithKnowledge(query: string): Promise<string> {
    try {
        // 1. Retrieve relevant documents
        console.log(`[Knowledge Agent] Searching for: "${query}"`);
        const results = await vectorStore.similaritySearch(query, 3);
        console.log(`[Knowledge Agent] Found ${results.length} results`);

        if (results.length === 0) {
            console.log("[Knowledge Agent] No results found in vector store");
            return "I couldn't find any specific information about that in my knowledge base. You might want to ask to speak to an agent.";
        }

        const context = results.map(r => r.pageContent).join("\n\n---\n\n");
        console.log(`[Knowledge Agent] Context length: ${context.length} chars`);

        // 2. Generate answer
        const { text } = await generateText({
            model: google("gemini-2.5-flash"),
            prompt: `You are an IT Support Assistant. Answer the user's question using the context provided below.

Context from IT Policy:
${context}

User Question: ${query}

Instructions:
- Use the information from the context to answer the question
- If the context contains step-by-step instructions, format them as a numbered list
- Be helpful, clear, and concise
- Only say you don't know if the context truly has no relevant information`,
        });

        return text;
    } catch (error) {
        console.error("[Knowledge Agent] Error:", error);
        return "I encountered an error searching the knowledge base. Please try again or ask to speak to an agent.";
    }
}
