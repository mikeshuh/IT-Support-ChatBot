export async function escalateToHuman(query: string): Promise<string> {
    // In a real app, this would create a ticket in Jira/ServiceNow.

    const ticketId = "INC-" + Math.floor(Math.random() * 10000);
    return `I have escalated your issue to a human agent. Your ticket ID is ${ticketId}. Someone will reach out to you shortly.`;
}
