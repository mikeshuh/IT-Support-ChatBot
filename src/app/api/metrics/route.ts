import { metrics } from "@/lib/metrics";

export async function GET() {
    try {
        // Get summary for last hour
        const hourSummary = metrics.getSummary(60 * 60 * 1000);

        // Get summary for last 24 hours
        const daySummary = metrics.getSummary(24 * 60 * 60 * 1000);

        // Get recent events
        const recentEvents = metrics.getRecentEvents(20);

        return Response.json({
            success: true,
            timestamp: new Date().toISOString(),
            lastHour: hourSummary,
            last24Hours: daySummary,
            recentEvents,
        });
    } catch (error) {
        console.error("Failed to fetch metrics:", error);
        return Response.json(
            { success: false, error: "Failed to fetch metrics" },
            { status: 500 }
        );
    }
}
