import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Ticket } from '@/lib/ticket-service';

/**
 * End-to-End Scenario Tests
 * 
 * These tests verify complete user scenarios from input to expected output.
 * They use mocks to isolate from external services but validate the full flow.
 */

// Mock all external dependencies
vi.mock('ai', () => ({
    generateObject: vi.fn(),
    generateText: vi.fn(),
    streamText: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
    google: vi.fn(() => 'mock-model'),
}));

vi.mock('@/lib/vector-store', () => ({
    vectorStore: {
        similaritySearch: vi.fn(),
    },
}));

vi.mock('@/lib/ticket-service', () => ({
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    listTickets: vi.fn(),
    analyzeSystemLogs: vi.fn(),
}));

import { generateObject, generateText } from 'ai';
import { vectorStore } from '@/lib/vector-store';
import { createTicket, getTicket, listTickets } from '@/lib/ticket-service';
import { classifyRequest } from '@/agents/intake/agent';
import { answerWithKnowledge } from '@/agents/knowledge/agent';
import { executeWorkflow } from '@/agents/workflow/agent';
import { escalateToHuman } from '@/agents/escalation/agent';

// Helper to create properly typed tickets
const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 1,
    title: 'Test Ticket',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    category: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('End-to-End Scenarios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Scenario 1: Password Reset Flow', () => {
        it('should handle complete password reset request', async () => {
            // Step 1: Classify as workflow
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'workflow', reason: 'Password reset request' },
            } as any);

            const intent = await classifyRequest('I need to reset my password');
            expect(intent).toBe('workflow');

            // Step 2: Execute workflow
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: {
                    action: 'password_reset',
                    parameters: {},
                    reasoning: 'User wants password reset',
                },
            } as any);

            const result = await executeWorkflow('I need to reset my password');

            expect(result.action).toBe('password_reset');
            expect(result.success).toBe(true);
            expect(result.message).toContain('password reset');
            expect(result.message).toContain('backup email');
        });
    });

    describe('Scenario 2: VPN Troubleshooting Flow', () => {
        it('should handle VPN help request with knowledge base', async () => {
            // Step 1: Classify as knowledge
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'knowledge', reason: 'VPN how-to question' },
            } as any);

            const intent = await classifyRequest('How do I connect to the VPN?');
            expect(intent).toBe('knowledge');

            // Step 2: Retrieve and answer
            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce([
                { pageContent: 'VPN Client: Cisco AnyConnect. Server: vpn.example.com', metadata: {}, similarity: 0.9 },
                { pageContent: 'Auth: AD credentials + Duo 2FA', metadata: {}, similarity: 0.85 },
            ]);

            vi.mocked(generateText).mockResolvedValueOnce({
                text: 'To connect to VPN: 1) Install Cisco AnyConnect 2) Connect to vpn.example.com 3) Use your AD credentials with Duo 2FA',
            } as any);

            const answer = await answerWithKnowledge('How do I connect to the VPN?');

            expect(answer).toContain('Cisco AnyConnect');
            expect(answer).toContain('vpn.example.com');
        });
    });

    describe('Scenario 3: Hardware Ticket Creation Flow', () => {
        it('should create ticket for broken hardware', async () => {
            const mockTicket = createMockTicket({
                id: 42,
                title: 'Broken monitor',
                description: 'My monitor is not turning on, shows no display at all',
                priority: 'high',
                category: 'hardware',
            });

            // Step 1: Classify as workflow
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'workflow', reason: 'Hardware issue requiring ticket' },
            } as any);

            const intent = await classifyRequest('My monitor is not turning on');
            expect(intent).toBe('workflow');

            // Step 2: Create ticket
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: {
                    action: 'create_ticket',
                    parameters: {
                        title: 'Broken monitor',
                        description: 'My monitor is not turning on, shows no display at all',
                        priority: 'high',
                        category: 'hardware',
                    },
                    reasoning: 'Hardware issue needs ticket',
                },
            } as any);

            vi.mocked(createTicket).mockResolvedValueOnce(mockTicket);

            const result = await executeWorkflow('My monitor is not turning on, shows no display at all');

            expect(result.action).toBe('create_ticket');
            expect(result.success).toBe(true);
            expect(result.message).toContain('#42');
            expect(result.data).toEqual(mockTicket);
        });
    });

    describe('Scenario 4: Ticket Status Check Flow', () => {
        it('should return ticket status when checking by ID', async () => {
            const mockTicket = createMockTicket({
                id: 100,
                title: 'Keyboard replacement',
                status: 'in_progress',
                category: 'hardware',
            });

            // Step 1: Classify as workflow
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'workflow', reason: 'Status check request' },
            } as any);

            const intent = await classifyRequest("What's the status of ticket #100?");
            expect(intent).toBe('workflow');

            // Step 2: Check status
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: {
                    action: 'check_status',
                    parameters: { ticketId: 100 },
                    reasoning: 'User checking ticket status',
                },
            } as any);

            vi.mocked(getTicket).mockResolvedValueOnce(mockTicket);

            const result = await executeWorkflow("What's the status of ticket #100?");

            expect(result.action).toBe('check_status');
            expect(result.success).toBe(true);
            expect(result.message).toContain('100');
            expect(result.message).toContain('in_progress');
        });
    });

    describe('Scenario 5: Human Escalation Flow', () => {
        it('should escalate to human agent and create ticket', async () => {
            const mockTicket = createMockTicket({
                id: 999,
                title: 'Escalation: This is too complicated...',
                priority: 'high',
            });

            // Step 1: Classify as escalation
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'escalation', reason: 'User frustrated and wants human' },
            } as any);

            const intent = await classifyRequest('This is too complicated, I need to talk to someone');
            expect(intent).toBe('escalation');

            // Step 2: Escalate
            vi.mocked(createTicket).mockResolvedValueOnce(mockTicket);

            const result = await escalateToHuman('This is too complicated, I need to talk to someone');

            expect(result.ticketId).toBe(999);
            expect(result.message).toContain('human agent');
            expect(result.message).toContain('#999');
            expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({
                priority: 'high',
            }));
        });
    });

    describe('Scenario 6: List Open Tickets Flow', () => {
        it('should list all open tickets', async () => {
            const mockTickets: Ticket[] = [
                createMockTicket({ id: 1, title: 'Issue A', priority: 'high', category: 'hardware' }),
                createMockTicket({ id: 2, title: 'Issue B', category: 'software' }),
            ];

            // Step 1: Classify as workflow
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: { intent: 'workflow', reason: 'Ticket listing request' },
            } as any);

            const intent = await classifyRequest('Show all my open tickets');
            expect(intent).toBe('workflow');

            // Step 2: List tickets
            vi.mocked(generateObject).mockResolvedValueOnce({
                object: {
                    action: 'list_tickets',
                    parameters: { statusFilter: 'open' },
                    reasoning: 'User wants to see open tickets',
                },
            } as any);

            vi.mocked(listTickets).mockResolvedValueOnce(mockTickets);

            const result = await executeWorkflow('Show all my open tickets');

            expect(result.action).toBe('list_tickets');
            expect(result.success).toBe(true);
            expect(result.message).toContain('#1');
            expect(result.message).toContain('#2');
            expect(result.data).toHaveLength(2);
        });
    });
});
