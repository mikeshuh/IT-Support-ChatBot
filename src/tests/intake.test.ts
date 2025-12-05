import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI SDK with simpler return values
vi.mock('ai', () => ({
    generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
    google: vi.fn(() => 'mock-model'),
}));

import { generateObject } from 'ai';
import { classifyRequest } from '@/agents/intake/agent';

// Helper to create mock response
const mockGenerateObjectResponse = (intent: string, reason: string) => ({
    object: { intent, reason },
});

describe('Intake Agent - classifyRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('LLM Classification', () => {
        it('should classify password-related queries as "workflow"', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockGenerateObjectResponse('workflow', 'Password reset request') as any
            );

            const result = await classifyRequest('I need to reset my password');
            expect(result).toBe('workflow');
        });

        it('should classify VPN questions as "knowledge"', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockGenerateObjectResponse('knowledge', 'VPN information request') as any
            );

            const result = await classifyRequest('How do I connect to the VPN?');
            expect(result).toBe('knowledge');
        });

        it('should classify human agent requests as "escalation"', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockGenerateObjectResponse('escalation', 'User wants human assistance') as any
            );

            const result = await classifyRequest('I want to speak to a human agent');
            expect(result).toBe('escalation');
        });

        it('should classify ticket requests as "workflow"', async () => {
            vi.mocked(generateObject).mockResolvedValueOnce(
                mockGenerateObjectResponse('workflow', 'Ticket creation request') as any
            );

            const result = await classifyRequest('My monitor is broken, create a ticket');
            expect(result).toBe('workflow');
        });
    });

    describe('Fallback Classification', () => {
        it('should fallback to "workflow" for reset keywords when LLM fails', async () => {
            vi.mocked(generateObject).mockRejectedValueOnce(new Error('API Error'));

            const result = await classifyRequest('Please reset my account');
            expect(result).toBe('workflow');
        });

        it('should fallback to "workflow" for ticket keywords when LLM fails', async () => {
            vi.mocked(generateObject).mockRejectedValueOnce(new Error('API Error'));

            const result = await classifyRequest('I need to file a ticket');
            expect(result).toBe('workflow');
        });

        it('should fallback to "escalation" for human keywords when LLM fails', async () => {
            vi.mocked(generateObject).mockRejectedValueOnce(new Error('API Error'));

            const result = await classifyRequest('I need to talk to a human agent');
            expect(result).toBe('escalation');
        });

        it('should fallback to "knowledge" for general queries when LLM fails', async () => {
            vi.mocked(generateObject).mockRejectedValueOnce(new Error('API Error'));

            const result = await classifyRequest('What is the email policy?');
            expect(result).toBe('knowledge');
        });
    });
});
