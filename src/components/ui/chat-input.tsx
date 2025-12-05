import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading?: boolean;
}

export const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
    ({ className, input, handleInputChange, handleSubmit, isLoading, ...props }, ref) => {
        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                if (form) form.requestSubmit();
            }
        };

        return (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="relative flex items-center w-full">
                <textarea
                    ref={ref}
                    className={cn(
                        "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-12",
                        className
                    )}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    {...props}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-3 top-3 p-2 rounded-md hover:bg-accent disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        );
    }
);
ChatInput.displayName = "ChatInput";
