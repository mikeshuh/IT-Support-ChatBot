/**
 * Metrics Tracking Utility
 * 
 * Tracks and logs performance metrics for the IT Support ChatBot:
 * - Response latency
 * - Agent routing accuracy
 * - Ticket creation success rate
 * - Knowledge retrieval performance
 */

export interface MetricEvent {
    timestamp: Date;
    type: 'latency' | 'routing' | 'ticket' | 'retrieval' | 'error';
    agent?: string;
    durationMs?: number;
    success?: boolean;
    metadata?: Record<string, any>;
}

export interface MetricsSummary {
    totalRequests: number;
    averageLatencyMs: number;
    routingAccuracy: number;
    ticketSuccessRate: number;
    retrievalHitRate: number;
    errorRate: number;
    byAgent: Record<string, { count: number; avgLatencyMs: number }>;
}

class MetricsTracker {
    private events: MetricEvent[] = [];
    private maxEvents: number = 1000;

    /**
     * Record a latency metric
     */
    recordLatency(agent: string, durationMs: number, metadata?: Record<string, any>) {
        this.addEvent({
            timestamp: new Date(),
            type: 'latency',
            agent,
            durationMs,
            success: true,
            metadata,
        });
    }

    /**
     * Record a routing decision
     */
    recordRouting(
        predictedAgent: string,
        actualAgent: string | null,
        durationMs: number
    ) {
        const isCorrect = actualAgent === null || predictedAgent === actualAgent;
        this.addEvent({
            timestamp: new Date(),
            type: 'routing',
            agent: predictedAgent,
            durationMs,
            success: isCorrect,
            metadata: { predictedAgent, actualAgent },
        });
    }

    /**
     * Record a ticket creation attempt
     */
    recordTicketCreation(success: boolean, ticketId?: number, durationMs?: number) {
        this.addEvent({
            timestamp: new Date(),
            type: 'ticket',
            success,
            durationMs,
            metadata: { ticketId },
        });
    }

    /**
     * Record a knowledge retrieval attempt
     */
    recordRetrieval(
        query: string,
        resultsCount: number,
        durationMs: number
    ) {
        this.addEvent({
            timestamp: new Date(),
            type: 'retrieval',
            durationMs,
            success: resultsCount > 0,
            metadata: { query: query.slice(0, 100), resultsCount },
        });
    }

    /**
     * Record an error
     */
    recordError(agent: string, error: string, metadata?: Record<string, any>) {
        this.addEvent({
            timestamp: new Date(),
            type: 'error',
            agent,
            success: false,
            metadata: { error, ...metadata },
        });
    }

    /**
     * Get summary statistics
     */
    getSummary(sinceMs?: number): MetricsSummary {
        const cutoff = sinceMs
            ? new Date(Date.now() - sinceMs)
            : new Date(0);

        const relevantEvents = this.events.filter(e => e.timestamp >= cutoff);

        const latencyEvents = relevantEvents.filter(e => e.type === 'latency');
        const routingEvents = relevantEvents.filter(e => e.type === 'routing');
        const ticketEvents = relevantEvents.filter(e => e.type === 'ticket');
        const retrievalEvents = relevantEvents.filter(e => e.type === 'retrieval');
        const errorEvents = relevantEvents.filter(e => e.type === 'error');

        const avgLatency = latencyEvents.length > 0
            ? latencyEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0) / latencyEvents.length
            : 0;

        const routingAccuracy = routingEvents.length > 0
            ? routingEvents.filter(e => e.success).length / routingEvents.length
            : 1;

        const ticketSuccessRate = ticketEvents.length > 0
            ? ticketEvents.filter(e => e.success).length / ticketEvents.length
            : 1;

        const retrievalHitRate = retrievalEvents.length > 0
            ? retrievalEvents.filter(e => e.success).length / retrievalEvents.length
            : 1;

        const totalRequests = latencyEvents.length;
        const errorRate = totalRequests > 0
            ? errorEvents.length / totalRequests
            : 0;

        // Calculate per-agent stats
        const byAgent: Record<string, { count: number; avgLatencyMs: number }> = {};
        const agentLatencies: Record<string, number[]> = {};

        for (const event of latencyEvents) {
            if (event.agent) {
                if (!agentLatencies[event.agent]) {
                    agentLatencies[event.agent] = [];
                }
                agentLatencies[event.agent].push(event.durationMs || 0);
            }
        }

        for (const [agent, latencies] of Object.entries(agentLatencies)) {
            byAgent[agent] = {
                count: latencies.length,
                avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            };
        }

        return {
            totalRequests,
            averageLatencyMs: Math.round(avgLatency),
            routingAccuracy: Math.round(routingAccuracy * 100) / 100,
            ticketSuccessRate: Math.round(ticketSuccessRate * 100) / 100,
            retrievalHitRate: Math.round(retrievalHitRate * 100) / 100,
            errorRate: Math.round(errorRate * 100) / 100,
            byAgent,
        };
    }

    /**
     * Get recent events
     */
    getRecentEvents(count: number = 10): MetricEvent[] {
        return this.events.slice(-count);
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.events = [];
    }

    /**
     * Export metrics as JSON
     */
    exportJSON(): string {
        return JSON.stringify({
            summary: this.getSummary(),
            events: this.events,
        }, null, 2);
    }

    private addEvent(event: MetricEvent) {
        this.events.push(event);

        // Keep only the last maxEvents
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Metrics] ${event.type}:`, event);
        }
    }
}

// Singleton instance
export const metrics = new MetricsTracker();

/**
 * Utility function to measure async function execution time
 */
export async function withLatencyTracking<T>(
    agent: string,
    fn: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = performance.now() - start;
        metrics.recordLatency(agent, duration);
        return result;
    } catch (error) {
        const duration = performance.now() - start;
        metrics.recordError(agent, String(error), { durationMs: duration });
        throw error;
    }
}
