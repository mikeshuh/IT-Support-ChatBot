import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
    onSubmit: (value: string) => void;
    isLoading?: boolean;
}

export const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
    ({ className, onSubmit, isLoading, ...props }, ref) => {
        const [input, setInput] = React.useState("");

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                    onSubmit(input);
                    setInput("");
                }
            }
        };

        return (
            <div className="relative flex items-center w-full">
                <textarea
                    ref={ref}
                    className={cn(
                        "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-12",
                        className
                    )}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    {...props}
                />
                <button
                    onClick={() => {
                        if (input.trim()) {
                            onSubmit(input);
                            setInput("");
                        }
                    }}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-3 top-3 p-2 rounded-md hover:bg-accent disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        );
    }
);
ChatInput.displayName = "ChatInput";
