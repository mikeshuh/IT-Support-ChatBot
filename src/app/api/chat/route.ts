import { GoogleGenerativeAI } from "@google/generative-ai";
import { classifyRequest } from "@/agents/intake/agent";
import { getAnswer } from "@/agents/knowledge/agent";
import { executeWorkflow } from "@/agents/workflow/agent";
import { escalateToHuman } from "@/agents/escalation/agent";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const query = lastMessage.content;

        const intent = await classifyRequest(query);

        let responseText = "";

        if (intent === "knowledge") {
            responseText = await getAnswer(query);
        } else if (intent === "workflow") {
            responseText = await executeWorkflow(query);
        } else {
            responseText = await escalateToHuman(query);
        }

        // Use Google Gemini to generate a natural response based on the agent's output
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a helpful IT Support Assistant. 
You have just received information from an internal agent regarding the user's query.
Agent Output: "${responseText}"

Your goal is to communicate this information to the user in a friendly and professional manner.
If the agent output is an answer, provide it clearly.
If it's a workflow confirmation, confirm it.
If it's an escalation, reassure the user.

User query: ${query}`;

        const result = await model.generateContent(prompt);
        const assistantResponse = result.response.text();

        return new Response(assistantResponse);
    } catch (error) {
        console.error("API Error:", error);
        return new Response(
            JSON.stringify({ error: "An error occurred", details: String(error) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
