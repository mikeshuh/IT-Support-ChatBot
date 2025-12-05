import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { vectorStore } from "@/lib/vector-store";

export async function answerWithKnowledge(query: string): Promise<string> {
    // 1. Retrieve relevant documents
    const results = await vectorStore.similaritySearch(query, 3);

    if (results.length === 0) {
        return "I couldn't find any specific information about that in my knowledge base. You might want to ask to speak to an agent.";
    }

    const context = results.map(r => r.pageContent).join("\n\n---\n\n");

    // 2. Generate answer
    const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: `You are an IT Support Assistant. Answer the user's question based ONLY on the following context.
    
    Context:
    ${context}
    
    Question: ${query}
    
    If the context doesn't contain the answer, say you don't know and suggest asking for a human agent. Keep the answer helpful and concise.`,
    });

    return text;
}
