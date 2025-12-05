import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Ticket } from '@/lib/ticket-service';

// Mock the ticket service
vi.mock('@/lib/ticket-service', () => ({
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    listTickets: vi.fn(),
    analyzeSystemLogs: vi.fn(),
}));

// Mock the AI SDK
vi.mock('ai', () => ({
    generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
    google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { createTicket, getTicket, listTickets, analyzeSystemLogs } from '@/lib/ticket-service';
import { executeWorkflow } from '@/agents/workflow/agent';

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

// Helper to create mock response
const mockActionResponse = (action: string, parameters: Record<string, any> = {}, reasoning: string = '') => ({
    object: { action, parameters, reasoning },
});

describe('Workflow Agent - executeWorkflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Ticket Creation', () => {
        it('should create a ticket with extracted parameters', async () => {
            const mockTicket = createMockTicket({
                id: 123,
                title: 'Monitor not working',
                description: 'My monitor is broken and shows no display',
                priority: 'high',
                category: 'hardware',
            });

            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('create_ticket', {
                    title: 'Monitor not working',
                    description: 'My monitor is broken and shows no display',
                    priority: 'high',
                    category: 'hardware',
                }, 'User reports hardware issue') as any
            );

            vi.mocked(createTicket).mockResolvedValueOnce(mockTicket);

            const result = await executeWorkflow('My monitor is broken and shows no display');

            expect(result.action).toBe('create_ticket');
            expect(result.success).toBe(true);
            expect(result.message).toContain('#123');
        });
    });

    describe('Ticket Status Check', () => {
        it('should return ticket details when found', async () => {
            const mockTicket = createMockTicket({
                id: 456,
                title: 'WiFi issue',
                status: 'in_progress',
                category: 'network',
            });

            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('check_status', { ticketId: 456 }, 'User wants to check ticket status') as any
            );

            vi.mocked(getTicket).mockResolvedValueOnce(mockTicket);

            const result = await executeWorkflow("What's the status of ticket #456?");

            expect(result.action).toBe('check_status');
            expect(result.success).toBe(true);
            expect(result.message).toContain('456');
            expect(result.message).toContain('in_progress');
        });

        it('should return error when ticket not found', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('check_status', { ticketId: 999 }, 'User wants to check ticket status') as any
            );

            vi.mocked(getTicket).mockResolvedValueOnce(null);

            const result = await executeWorkflow("What's the status of ticket #999?");

            expect(result.action).toBe('check_status');
            expect(result.success).toBe(false);
            expect(result.message).toContain("couldn't find");
        });

        it('should ask for ticket ID when not provided', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('check_status', {}, 'User wants to check status but no ID provided') as any
            );

            const result = await executeWorkflow("Check my ticket status");

            expect(result.action).toBe('check_status');
            expect(result.success).toBe(false);
            expect(result.message).toContain('ticket number');
        });
    });

    describe('List Tickets', () => {
        it('should list tickets with status filter', async () => {
            const mockTickets: Ticket[] = [
                createMockTicket({ id: 1, title: 'Issue 1', priority: 'high', category: 'hardware' }),
                createMockTicket({ id: 2, title: 'Issue 2', category: 'software' }),
            ];

            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('list_tickets', { statusFilter: 'open' }, 'User wants to see open tickets') as any
            );

            vi.mocked(listTickets).mockResolvedValueOnce(mockTickets);

            const result = await executeWorkflow("Show my open tickets");

            expect(result.action).toBe('list_tickets');
            expect(result.success).toBe(true);
            expect(result.message).toContain('#1');
            expect(result.message).toContain('#2');
        });

        it('should handle empty ticket list', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('list_tickets', { statusFilter: 'all' }, 'User wants to see all tickets') as any
            );

            vi.mocked(listTickets).mockResolvedValueOnce([]);

            const result = await executeWorkflow("Show all my tickets");

            expect(result.action).toBe('list_tickets');
            expect(result.success).toBe(true);
            expect(result.message).toContain('no tickets');
        });
    });

    describe('Password Reset', () => {
        it('should return password reset instructions', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('password_reset', {}, 'User needs to reset password') as any
            );

            const result = await executeWorkflow("I need to reset my password");

            expect(result.action).toBe('password_reset');
            expect(result.success).toBe(true);
            expect(result.message).toContain('password reset');
            expect(result.message).toContain('backup email');
        });
    });

    describe('Log Analysis', () => {
        it('should analyze VPN logs', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('analyze_logs', { system: 'vpn' }, 'User wants VPN diagnostics') as any
            );

            vi.mocked(analyzeSystemLogs).mockReturnValueOnce({
                status: 'healthy',
                findings: ['No issues detected', 'Uptime 99.9%'],
            });

            const result = await executeWorkflow("Analyze VPN connection logs");

            expect(result.action).toBe('analyze_logs');
            expect(result.success).toBe(true);
            expect(result.message).toContain('VPN');
            expect(result.message).toContain('Healthy');
        });

        it('should ask for system when not specified', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockActionResponse('analyze_logs', {}, 'User wants log analysis but system not specified') as any
            );

            const result = await executeWorkflow("Analyze system logs");

            expect(result.action).toBe('analyze_logs');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Which system');
        });
    });

    describe('Fallback Behavior', () => {
        it('should fallback to keyword matching when LLM fails', async () => {
            const mockTicket = createMockTicket({ id: 789, title: 'Keyboard broken' });

            vi.mocked(generateObject).mockRejectedValueOnce(new Error('API Error'));
            vi.mocked(createTicket).mockResolvedValueOnce(mockTicket);

            const result = await executeWorkflow("My keyboard is broken");

            expect(result.action).toBe('create_ticket');
            expect(result.success).toBe(true);
            expect(result.message).toContain('#789');
        });
    });
});
