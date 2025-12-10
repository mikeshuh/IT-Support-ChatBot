import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
    createTicket,
    getTicket,
    listTickets,
    updateTicketStatus,
    analyzeSystemLogs,
    type Ticket,
} from "@/lib/ticket-service";

// Schema for action selection
const ActionSchema = z.object({
    action: z.enum([
        "create_ticket",
        "check_status",
        "list_tickets",
        "update_status",
        "password_reset",
        "analyze_logs",
        "unknown",
    ]),
    parameters: z.object({
        // For create_ticket
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        category: z.enum(["hardware", "software", "network", "access", "other"]).optional(),
        // For check_status
        ticketId: z.number().optional(),
        // For list_tickets
        statusFilter: z.enum(["open", "in_progress", "resolved", "closed", "all"]).optional(),
        // For update_status
        newStatus: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        // For analyze_logs
        system: z.enum(["vpn", "email", "network", "authentication"]).optional(),
    }),
    reasoning: z.string().describe("Brief explanation of why this action was chosen"),
});

export interface WorkflowResult {
    action: string;
    success: boolean;
    message: string;
    data?: Ticket | Ticket[] | { status: string; findings: string[] };
}

export async function executeWorkflow(query: string): Promise<WorkflowResult> {
    try {
        // Step 1: Use LLM to determine the action and extract parameters
        const { object: decision } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: ActionSchema,
            prompt: `You are an IT Workflow Automation Agent. Analyze the user's request and determine the appropriate action.

Available Actions:
1. create_ticket - Create a new IT support ticket for hardware issues, software problems, access requests, etc.
2. check_status - Check the status of an existing ticket (requires ticket ID)
3. list_tickets - List recent tickets, optionally filtered by status
4. update_status - Update a ticket's status (mark as resolved, closed, in_progress, or reopen)
5. password_reset - Initiate a password reset
6. analyze_logs - Analyze system logs for diagnostics (vpn, email, network, authentication)
7. unknown - If the request doesn't match any action

For create_ticket, extract:
- title: A SHORT title (3-6 words max). Examples: "Broken Monitor", "VPN Connection Issue", "Password Reset Request", "Laptop Not Booting". DO NOT include explanatory text or prompts - just a simple title.
- description: The full problem description from the user
- priority: low/medium/high/critical (based on urgency)
- category: hardware/software/network/access/other

For check_status, extract:
- ticketId: The numeric ticket ID mentioned

For list_tickets, extract:
- statusFilter: open/in_progress/resolved/closed/all

For update_status, extract:
- ticketId: The numeric ticket ID to update
- newStatus: Map the user's intent to one of these values:
  * "closed" - if user says: close, closed, mark closed, shut, complete, done, finished
  * "resolved" - if user says: resolve, resolved, fix, fixed, mark resolved, mark as resolved
  * "in_progress" - if user says: in progress, working on, start, started, begin
  * "open" - if user says: reopen, open, re-open, unclose
  IMPORTANT: Always extract newStatus when the user's intent is clear. "close ticket 10" means newStatus="closed".

For analyze_logs, extract:
- system: vpn/email/network/authentication

User Request: "${query}"`,
        });

        // Step 2: Execute the action
        switch (decision.action) {
            case "create_ticket": {
                const ticket = await createTicket({
                    title: decision.parameters.title || query.slice(0, 50),
                    description: decision.parameters.description || query,
                    priority: decision.parameters.priority || "medium",
                    category: decision.parameters.category || "other",
                });
                return {
                    action: "create_ticket",
                    success: true,
                    message: `I've created ticket #${ticket.id} for your issue: "${ticket.title}". Priority: ${ticket.priority}. A technician will review and respond within 24 hours.`,
                    data: ticket,
                };
            }

            case "check_status": {
                if (!decision.parameters.ticketId) {
                    return {
                        action: "check_status",
                        success: false,
                        message: "I'd be happy to check your ticket status. Could you please provide the ticket number?",
                    };
                }
                const ticket = await getTicket(decision.parameters.ticketId);
                if (!ticket) {
                    return {
                        action: "check_status",
                        success: false,
                        message: `I couldn't find ticket #${decision.parameters.ticketId}. Please verify the ticket number and try again.`,
                    };
                }
                return {
                    action: "check_status",
                    success: true,
                    message: `Ticket #${ticket.id}: "${ticket.title}"\n• Status: ${ticket.status}\n• Priority: ${ticket.priority}\n• Category: ${ticket.category}\n• Created: ${new Date(ticket.createdAt).toLocaleDateString()}`,
                    data: ticket,
                };
            }

            case "list_tickets": {
                const tickets = await listTickets(
                    decision.parameters.statusFilter || "all",
                    5
                );
                if (tickets.length === 0) {
                    return {
                        action: "list_tickets",
                        success: true,
                        message: "There are no tickets matching your criteria.",
                        data: [],
                    };
                }
                const ticketList = tickets
                    .map(t => `• #${t.id}: ${t.title} [${t.status}] - ${t.priority}`)
                    .join("\n");
                return {
                    action: "list_tickets",
                    success: true,
                    message: `Here are your recent tickets:\n${ticketList}`,
                    data: tickets,
                };
            }

            case "update_status": {
                if (!decision.parameters.ticketId) {
                    return {
                        action: "update_status",
                        success: false,
                        message: "I'd be happy to update the ticket status. Could you please provide the ticket number?",
                    };
                }

                // Fallback: infer status from keywords if LLM didn't extract it
                let status = decision.parameters.newStatus;
                if (!status) {
                    const lowerQuery = query.toLowerCase();
                    if (lowerQuery.includes("close") || lowerQuery.includes("shut") || lowerQuery.includes("done") || lowerQuery.includes("complete") || lowerQuery.includes("finish")) {
                        status = "closed";
                    } else if (lowerQuery.includes("resolve") || lowerQuery.includes("fix")) {
                        status = "resolved";
                    } else if (lowerQuery.includes("progress") || lowerQuery.includes("start") || lowerQuery.includes("work") || lowerQuery.includes("begin")) {
                        status = "in_progress";
                    } else if (lowerQuery.includes("reopen") || lowerQuery.includes("re-open")) {
                        status = "open";
                    }
                }

                if (!status) {
                    return {
                        action: "update_status",
                        success: false,
                        message: "What status would you like to set? Options: open, in_progress, resolved, or closed.",
                    };
                }

                const updatedTicket = await updateTicketStatus(
                    decision.parameters.ticketId,
                    status
                );
                if (!updatedTicket) {
                    return {
                        action: "update_status",
                        success: false,
                        message: `I couldn't find ticket #${decision.parameters.ticketId}. Please verify the ticket number and try again.`,
                    };
                }
                return {
                    action: "update_status",
                    success: true,
                    message: `Done! Ticket #${updatedTicket.id} has been updated to "${updatedTicket.status}".`,
                    data: updatedTicket,
                };
            }

            case "password_reset": {
                return {
                    action: "password_reset",
                    success: true,
                    message: `I've initiated the password reset process. Here's what to do next:

1. Check your backup email for a verification code
2. Visit https://password.example.com
3. Enter your username and the verification code
4. Create a new password (12+ characters, mix of letters, numbers, symbols)

If you don't receive the email within 5 minutes, contact the helpdesk at 555-0199.`,
                };
            }

            case "analyze_logs": {
                if (!decision.parameters.system) {
                    return {
                        action: "analyze_logs",
                        success: false,
                        message: "Which system would you like me to analyze? Options: VPN, Email, Network, or Authentication.",
                    };
                }
                const analysis = analyzeSystemLogs(decision.parameters.system);
                const findingsList = analysis.findings.map(f => `• ${f}`).join("\n");
                return {
                    action: "analyze_logs",
                    success: true,
                    message: `**${decision.parameters.system.toUpperCase()} System Analysis**\nStatus: ${analysis.status === "healthy" ? "✅ Healthy" : "⚠️ Warning"}\n\nFindings:\n${findingsList}`,
                    data: analysis,
                };
            }

            default:
                return {
                    action: "unknown",
                    success: false,
                    message: "I'm not sure how to handle that workflow request. Could you please rephrase or try one of these:\n• Create a ticket for an issue\n• Check ticket status\n• Reset your password\n• Analyze system logs",
                };
        }
    } catch (error) {
        console.error("Workflow execution failed:", error);
        // Fallback to simple keyword matching
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes("ticket") || lowerQuery.includes("broken") || lowerQuery.includes("issue") || lowerQuery.includes("fix")) {
            const ticket = await createTicket({
                title: query.slice(0, 50),
                description: query,
                priority: "medium",
                category: "other",
            });
            return {
                action: "create_ticket",
                success: true,
                message: `I've created ticket #${ticket.id} for your issue. A technician will review it within 24 hours.`,
                data: ticket,
            };
        }

        if (lowerQuery.includes("password") || lowerQuery.includes("reset")) {
            return {
                action: "password_reset",
                success: true,
                message: "I've initiated the password reset process. Please check your backup email for a verification code.",
            };
        }

        return {
            action: "unknown",
            success: false,
            message: "I encountered an error processing your request. Please try again or contact the helpdesk at 555-0199.",
        };
    }
}
