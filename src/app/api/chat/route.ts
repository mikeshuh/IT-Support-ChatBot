import { streamText } from 'ai';
// import { openai } from '@ai-sdk/openai'; 
import { classifyRequest } from "@/agents/intake/agent";
import { getAnswer } from "@/agents/knowledge/agent";
import { executeWorkflow } from "@/agents/workflow/agent";
import { escalateToHuman } from "@/agents/escalation/agent";

export async function POST(req: Request) {
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

    return new Response(responseText);
}
