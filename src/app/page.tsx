"use client";

import { useChat, Message } from "ai/react";
import { ChatMessage } from "@/components/ui/chat-message";
import { ChatInput } from "@/components/ui/chat-input";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          IT Support Chatbot
        </p>
      </div>

      <div className="flex flex-col w-full max-w-3xl flex-1 overflow-hidden rounded-lg border bg-background shadow-xl mt-8 mb-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              How can I help you with your IT issues today?
            </div>
          )}
          {messages.map((m: Message) => (
            <ChatMessage key={m.id} message={m as any} />
          ))}
        </div>
        <div className="p-4 border-t bg-muted/50">
          <ChatInput onSubmit={(value) => append({ role: 'user', content: value })} isLoading={isLoading} />
        </div>
      </div>
    </main>
  );
}
