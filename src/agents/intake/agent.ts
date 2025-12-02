export async function classifyRequest(message: string): Promise<"knowledge" | "workflow" | "escalation"> {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("reset") || lowerMsg.includes("password") || lowerMsg.includes("ticket")) {
        return "workflow";
    }

    if (lowerMsg.includes("human") || lowerMsg.includes("agent") || lowerMsg.includes("help")) {
        return "escalation";
    }

    return "knowledge";
}
