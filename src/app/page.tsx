"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  Bot,
  User,
  Ticket,
  RotateCcw,
  Moon,
  Sun,
  Sparkles,
  KeyRound,
  HardDrive,
  Wifi,
  ClipboardList,
  MessageSquare,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentInfo?: {
    agent: string;
    action?: string;
  };
}

interface AgentStatus {
  agent: string;
  status: string;
}

const quickActions = [
  { label: "Reset Password", prompt: "I need to reset my password", icon: KeyRound, color: "from-blue-500 to-cyan-500" },
  { label: "Report Issue", prompt: "I need to file a ticket for a broken device", icon: HardDrive, color: "from-orange-500 to-red-500" },
  { label: "VPN Help", prompt: "How do I connect to the VPN?", icon: Wifi, color: "from-green-500 to-emerald-500" },
  { label: "Check Ticket", prompt: "What's the status of my tickets?", icon: ClipboardList, color: "from-purple-500 to-pink-500" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isDark, setIsDark] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        const assistantId = (Date.now() + 1).toString();
        let messageAdded = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete event in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "status") {
                  // Update agent status from backend
                  setAgentStatus({ agent: data.agent, status: data.status });
                } else if (data.type === "text") {
                  // Clear status when we start getting text
                  setAgentStatus(null);

                  // Add message container if not yet added
                  if (!messageAdded) {
                    messageAdded = true;
                    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
                  }

                  // Append text content
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + data.content }
                        : m
                    )
                  );
                } else if (data.type === "done") {
                  // Response complete
                  setAgentStatus(null);
                }
              } catch (parseError) {
                console.error("Failed to parse SSE event:", parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setAgentStatus(null);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 animate-gradient">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">IT Support Bot</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tickets"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Tickets</span>
            </Link>
            <button
              onClick={clearChat}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 animate-fade-in">
              <div className="relative mb-6">
                <div className="p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl shadow-2xl shadow-blue-500/30 animate-gradient">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                  Online
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                I can help with password resets, IT tickets, VPN issues, and more.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="group flex items-center gap-3 p-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-zinc-700/50 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-lg transition-all btn-hover-lift"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, index) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"} animate-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {m.role === "assistant" && (
                  <div className="flex-shrink-0 p-2 h-fit bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 shadow-md ${m.role === "user" ? "message-user" : "message-assistant"
                    }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
                {m.role === "user" && (
                  <div className="flex-shrink-0 p-2 h-fit bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-md">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Agent Status Indicator */}
          {agentStatus && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 p-2 h-fit bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="agent-status agent-status-active">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">{agentStatus.agent} Agent:</span>
                <span>{agentStatus.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 glass-strong border-t border-gray-200/50 dark:border-zinc-800/50">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  className="w-full min-h-[52px] max-h-32 px-4 py-3 pr-12 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none shadow-sm transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  rows={1}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all btn-hover-lift"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
              Press Enter to send • Shift+Enter for new line •{" "}
              <Link href="/tickets" className="hover:text-blue-500 transition-colors">
                View tickets
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
