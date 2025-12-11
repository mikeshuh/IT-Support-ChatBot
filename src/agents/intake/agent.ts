import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export async function classifyRequest(message: string): Promise<"knowledge" | "workflow" | "escalation"> {
    try {
        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: z.object({
                intent: z.enum(["knowledge", "workflow", "escalation"]),
                reason: z.string().describe("Brief explanation of why this intent was chosen."),
            }),
            prompt: `Classify the following IT support request into one of these categories:
      
      - knowledge: Questions about policies, how-to guides, procedures, or information retrieval. This includes questions about HOW to do something like reset a password, connect to VPN, etc. (e.g., "how do I reset my password?", "I need to reset my password", "what is the VPN server?", "how do I connect to wifi?")
      - workflow: Requests that require CREATING or MODIFYING something in the system, such as creating a support ticket, checking ticket status, or updating ticket status. (e.g., "create a ticket for my broken laptop", "check status of ticket #5", "close ticket 10")
      - escalation: Requests to speak to a human, frustration expression, or complicated issues the bot clearly cannot handle. (e.g., "talk to agent", "this isn't helping")
      
      Request: "${message}"`,
        });

        return object.intent;
    } catch (error) {
        console.error("Classification failed, falling back to keyword matching:", error);
        // Fallback logic
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes("ticket") || lowerMsg.includes("close") || lowerMsg.includes("status")) return "workflow";
        if (lowerMsg.includes("human") || lowerMsg.includes("agent")) return "escalation";
        return "knowledge";
    }
}
