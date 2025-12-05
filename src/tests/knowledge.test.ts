import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the vector store
vi.mock('@/lib/vector-store', () => ({
    vectorStore: {
        similaritySearch: vi.fn(),
    },
}));

// Mock the AI SDK
vi.mock('ai', () => ({
    generateText: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
    google: vi.fn(() => 'mock-model'),
}));

import { generateText } from 'ai';
import { vectorStore } from '@/lib/vector-store';
import { answerWithKnowledge } from '@/agents/knowledge/agent';

// Helper to create mock generateText response
const mockTextResponse = (text: string) => ({
    text,
});

describe('Knowledge Agent - answerWithKnowledge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Successful Retrieval', () => {
        it('should return answer when documents are found', async () => {
            const mockDocs = [
                { pageContent: 'VPN server address: vpn.example.com', metadata: {}, similarity: 0.9 },
                { pageContent: 'Use Cisco AnyConnect client', metadata: {}, similarity: 0.85 },
            ];

            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce(mockDocs);
            vi.mocked(generateText).mockResolvedValueOnce(
                mockTextResponse('To connect to VPN, use Cisco AnyConnect and connect to vpn.example.com') as any
            );

            const result = await answerWithKnowledge('How do I connect to VPN?');

            expect(vectorStore.similaritySearch).toHaveBeenCalledWith('How do I connect to VPN?', 3);
            expect(result).toContain('VPN');
            expect(result).toContain('Cisco AnyConnect');
        });

        it('should concatenate multiple document contexts', async () => {
            const mockDocs = [
                { pageContent: 'Password must be 12 characters', metadata: {}, similarity: 0.9 },
                { pageContent: 'Passwords expire every 90 days', metadata: {}, similarity: 0.85 },
                { pageContent: 'Visit password.example.com to reset', metadata: {}, similarity: 0.8 },
            ];

            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce(mockDocs);
            vi.mocked(generateText).mockResolvedValueOnce(
                mockTextResponse('Your password must be 12 characters and expires every 90 days. Reset at password.example.com') as any
            );

            const result = await answerWithKnowledge('What is the password policy?');

            expect(result).toContain('12 characters');
            expect(result).toContain('90 days');
        });
    });

    describe('No Results Found', () => {
        it('should return fallback message when no documents found', async () => {
            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce([]);

            const result = await answerWithKnowledge('What is the meaning of life?');

            expect(result).toContain("couldn't find");
            expect(result).toContain('agent');
            expect(generateText).not.toHaveBeenCalled();
        });
    });

    describe('Query Handling', () => {
        it('should handle VPN-related queries', async () => {
            const mockDocs = [
                { pageContent: 'VPN client: Cisco AnyConnect', metadata: {}, similarity: 0.9 },
            ];

            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce(mockDocs);
            vi.mocked(generateText).mockResolvedValueOnce(
                mockTextResponse('The VPN client is Cisco AnyConnect') as any
            );

            const result = await answerWithKnowledge('Which VPN client should I use?');

            expect(result).toContain('Cisco AnyConnect');
        });

        it('should handle WiFi-related queries', async () => {
            const mockDocs = [
                { pageContent: 'WiFi SSID: CorpNet-Secure for employees', metadata: {}, similarity: 0.9 },
            ];

            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce(mockDocs);
            vi.mocked(generateText).mockResolvedValueOnce(
                mockTextResponse('Connect to CorpNet-Secure network using your AD credentials') as any
            );

            const result = await answerWithKnowledge('How do I connect to office WiFi?');

            expect(result).toContain('CorpNet-Secure');
        });

        it('should handle escalation matrix queries', async () => {
            const mockDocs = [
                { pageContent: 'Tier 1: Chatbot, Tier 2: Helpdesk, Tier 3: SysAdmins', metadata: {}, similarity: 0.9 },
            ];

            vi.mocked(vectorStore.similaritySearch).mockResolvedValueOnce(mockDocs);
            vi.mocked(generateText).mockResolvedValueOnce(
                mockTextResponse('Support tiers are: Tier 1 (Chatbot), Tier 2 (Helpdesk with 24-hour SLA), Tier 3 (SysAdmins for critical issues)') as any
            );

            const result = await answerWithKnowledge('What is the escalation process?');

            expect(result).toContain('Tier');
        });
    });
});
