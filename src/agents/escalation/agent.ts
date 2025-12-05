import { createTicket, type Ticket } from "@/lib/ticket-service";

export interface EscalationResult {
    ticketId: number;
    message: string;
    ticket: Ticket;
}

export async function escalateToHuman(query: string): Promise<EscalationResult> {
    // Create an escalation ticket in the database
    const ticket = await createTicket({
        title: `Escalation: ${query.slice(0, 40)}...`,
        description: `User requested human assistance.\n\nOriginal request: ${query}`,
        priority: "high",
        category: "other",
    });

    return {
        ticketId: ticket.id,
        message: `I understand you'd like to speak with a human agent. I've escalated your request.

**Escalation Ticket: #${ticket.id}**

A support specialist will reach out to you shortly. Expected response time:
• Standard issues: Within 2 hours
• Complex issues: Within 24 hours

In the meantime, you can:
• Check ticket status by asking "What's the status of ticket #${ticket.id}?"
• View all your tickets at the Ticket Portal

If this is urgent, call the helpdesk directly at 555-0199.`,
        ticket,
    };
}
