"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    RefreshCw,
    Ticket,
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
} from "lucide-react";

interface TicketData {
    id: number;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "critical";
    category: string;
    createdAt: string;
    updatedAt: string;
}

const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
    open: <AlertCircle className="h-4 w-4" />,
    in_progress: <Clock className="h-4 w-4" />,
    resolved: <CheckCircle2 className="h-4 w-4" />,
    closed: <CheckCircle2 className="h-4 w-4" />,
};

export default function TicketsPage() {
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/tickets");
            const data = await response.json();
            if (data.success) {
                setTickets(data.tickets);
            } else {
                setError("Failed to load tickets");
            }
        } catch (err) {
            setError("Failed to connect to server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70 border-b border-gray-200/50 dark:border-zinc-800/50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Ticket className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                    Ticket Dashboard
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    View and track your IT support tickets
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={fetchTickets}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: "Total", count: tickets.length, color: "from-blue-500 to-blue-600" },
                        { label: "Open", count: tickets.filter(t => t.status === "open").length, color: "from-blue-400 to-cyan-500" },
                        { label: "In Progress", count: tickets.filter(t => t.status === "in_progress").length, color: "from-yellow-400 to-orange-500" },
                        { label: "Resolved", count: tickets.filter(t => t.status === "resolved").length, color: "from-green-400 to-emerald-500" },
                        { label: "Closed", count: tickets.filter(t => t.status === "closed").length, color: "from-gray-400 to-gray-500" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                {stat.count}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Tickets List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">{error}</p>
                        <button
                            onClick={fetchTickets}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-20">
                        <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No tickets yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Create a ticket by chatting with the IT Support Bot
                        </p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Go to Chat
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map((ticket, index) => (
                            <div
                                key={ticket.id}
                                className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-all hover:translate-y-[-2px] animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                                #{ticket.id}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                                                {statusIcons[ticket.status]}
                                                {ticket.status.replace("_", " ")}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
                                                {ticket.priority}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                            {ticket.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {ticket.description}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                                        <p>Created</p>
                                        <p className="font-medium">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700/50 flex items-center justify-between text-sm text-gray-500">
                                    <span className="capitalize">{ticket.category}</span>
                                    <span>
                                        Updated: {new Date(ticket.updatedAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
