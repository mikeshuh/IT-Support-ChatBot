"use client";

import { Loader2, CheckCircle2, Bot } from "lucide-react";

export function AgentStatus({ data }: { data: any[] | undefined }) {
    if (!data || data.length === 0) return null;

    // Find the latest status
    const statuses = data.filter((d: any) => d?.type === 'status');
    if (statuses.length === 0) return null;

    const currentStatus = statuses[statuses.length - 1].value;
    const isComplete = currentStatus === 'Finalizing response...' || currentStatus === 'Complete';

    if (!isComplete && !statuses.find(s => s.value === 'Finalizing response...')) {
        return (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-full w-fit mb-2 animate-in fade-in slide-in-from-bottom-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-medium">{currentStatus}</span>
            </div>
        );
    }

    return null;
}
