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
      
      - knowledge: Questions about policies, how-to guides, information retrieval, or general inquiries. (e.g., "how do I connect to VPN?", "what is the vacation policy?", "access denied error")
      - workflow: Requests that require an action to be performed, such as creating a ticket, resetting a password, or checking status. (e.g., "reset my password", "file a ticket", "my wifi is broken")
      - escalation: Requests to speak to a human, frustration expression, or complicated issues the bot clearly cannot handle. (e.g., "talk to agent", "this isn't helping")
      
      Request: "${message}"`,
        });

        return object.intent;
    } catch (error) {
        console.error("Classification failed, falling back to keyword matching:", error);
        // Fallback logic
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes("reset") || lowerMsg.includes("ticket")) return "workflow";
        if (lowerMsg.includes("human") || lowerMsg.includes("agent")) return "escalation";
        return "knowledge";
    }
}
