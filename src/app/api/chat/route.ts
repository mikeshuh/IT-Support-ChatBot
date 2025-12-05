import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { classifyRequest } from "@/agents/intake/agent";
import { answerWithKnowledge } from "@/agents/knowledge/agent";
import { executeWorkflow } from "@/agents/workflow/agent";
import { escalateToHuman } from "@/agents/escalation/agent";
import { metrics, withLatencyTracking } from "@/lib/metrics";

export const maxDuration = 60;

export async function POST(req: Request) {
    const requestStart = performance.now();
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Step 1: Classify intent with latency tracking
    const intent = await withLatencyTracking("intake", () =>
        classifyRequest(lastMessage)
    );
    metrics.recordRouting(intent, null, performance.now() - requestStart);

    // Step 2: Route to appropriate agent
    let agentResult = "";
    let agentName = "";

    if (intent === "knowledge") {
        agentName = "knowledge";
        agentResult = await withLatencyTracking("knowledge", () =>
            answerWithKnowledge(lastMessage)
        );
    } else if (intent === "workflow") {
        agentName = "workflow";
        const workflowResult = await withLatencyTracking("workflow", () =>
            executeWorkflow(lastMessage)
        );
        agentResult = workflowResult.message;

        // Track ticket creation if applicable
        if (workflowResult.action === "create_ticket") {
            metrics.recordTicketCreation(
                workflowResult.success,
                workflowResult.data && "id" in workflowResult.data ? workflowResult.data.id : undefined
            );
        }
    } else {
        agentName = "escalation";
        const escalationResult = await withLatencyTracking("escalation", () =>
            escalateToHuman(lastMessage)
        );
        agentResult = escalationResult.message;
        metrics.recordTicketCreation(true, escalationResult.ticketId);
    }

    // Step 3: Generate final response
    const result = streamText({
        model: google("gemini-2.5-flash"),
        prompt: `You are a helpful IT Support Assistant. 
        You have just received information from the ${agentName} agent regarding the user's query.
        
        User Query: "${lastMessage}"
        Agent Output: "${agentResult}"
        
        Goal: Communicate this information to the user in a friendly and professional manner.
        If the agent output is an answer, provide it clearly.
        If it's a ticket confirmation, confirm it warmly.
        If the agent output asks for clarification, ask the user politely.
        
        Keep your response concise and helpful. Don't add information that wasn't in the agent output.`,
    });

    return result.toTextStreamResponse();
}
