import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { classifyRequest } from "@/agents/intake/agent";
import { answerWithKnowledge } from "@/agents/knowledge/agent";
import { executeWorkflow } from "@/agents/workflow/agent";
import { escalateToHuman } from "@/agents/escalation/agent";
import { metrics, withLatencyTracking } from "@/lib/metrics";

export const maxDuration = 60;

// Helper to create a status event
function statusEvent(agent: string, status: string): string {
    return `data: ${JSON.stringify({ type: "status", agent, status })}\n\n`;
}

// Helper to create a text event
function textEvent(text: string): string {
    return `data: ${JSON.stringify({ type: "text", content: text })}\n\n`;
}

// Helper to create a done event
function doneEvent(): string {
    return `data: ${JSON.stringify({ type: "done" })}\n\n`;
}

export async function POST(req: Request) {
    const requestStart = performance.now();
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Create a readable stream that we can write to
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Step 1: Intake Agent - Classify intent
                controller.enqueue(encoder.encode(statusEvent("Intake", "Analyzing your request...")));

                const intent = await withLatencyTracking("intake", () =>
                    classifyRequest(lastMessage)
                );
                metrics.recordRouting(intent, null, performance.now() - requestStart);

                // Step 2: Route to appropriate agent
                let agentResult = "";
                let agentName = "";

                if (intent === "knowledge") {
                    controller.enqueue(encoder.encode(statusEvent("Knowledge", "Searching knowledge base...")));
                    agentName = "knowledge";
                    agentResult = await withLatencyTracking("knowledge", () =>
                        answerWithKnowledge(lastMessage)
                    );
                } else if (intent === "workflow") {
                    controller.enqueue(encoder.encode(statusEvent("Workflow", "Processing your request...")));
                    agentName = "workflow";
                    const workflowResult = await withLatencyTracking("workflow", () =>
                        executeWorkflow(lastMessage)
                    );
                    agentResult = workflowResult.message;

                    if (workflowResult.action === "create_ticket") {
                        metrics.recordTicketCreation(
                            workflowResult.success,
                            workflowResult.data && "id" in workflowResult.data ? workflowResult.data.id : undefined
                        );
                    }
                } else {
                    controller.enqueue(encoder.encode(statusEvent("Escalation", "Connecting to human support...")));
                    agentName = "escalation";
                    const escalationResult = await withLatencyTracking("escalation", () =>
                        escalateToHuman(lastMessage)
                    );
                    agentResult = escalationResult.message;
                    metrics.recordTicketCreation(true, escalationResult.ticketId);
                }

                // Step 3: Generate final response
                controller.enqueue(encoder.encode(statusEvent("Response", "Generating response...")));

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

                // Stream the text response
                for await (const chunk of result.textStream) {
                    controller.enqueue(encoder.encode(textEvent(chunk)));
                }

                controller.enqueue(encoder.encode(doneEvent()));
                controller.close();
            } catch (error) {
                console.error("Error in chat:", error);
                controller.enqueue(encoder.encode(textEvent("I apologize, but I encountered an error. Please try again.")));
                controller.enqueue(encoder.encode(doneEvent()));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
