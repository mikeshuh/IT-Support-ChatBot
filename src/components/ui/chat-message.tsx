import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system" | "data";
    content: string;
}

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "flex w-full items-start gap-4 p-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
                    isUser ? "bg-primary text-primary-foreground" : "bg-background"
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
                className={cn(
                    "flex-1 space-y-2 overflow-hidden px-1",
                    isUser ? "text-right" : "text-left"
                )}
            >
                <div className="prose break-words dark:prose-invert">
                    {message.content}
                </div>
            </div>
        </div>
    );
}
