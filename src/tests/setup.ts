import { vi } from 'vitest';

// Mock environment variables
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock pg Pool
vi.mock('pg', () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    const mockRelease = vi.fn();
    const mockConnect = vi.fn().mockResolvedValue({
        query: mockQuery,
        release: mockRelease,
    });

    return {
        Pool: vi.fn(() => ({
            query: mockQuery,
            connect: mockConnect,
        })),
    };
});
