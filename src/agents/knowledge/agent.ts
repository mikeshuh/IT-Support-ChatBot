import fs from "fs";
import path from "path";

export async function getAnswer(query: string): Promise<string> {
    // Temporary: Read policy directly instead of using vector store
    // This avoids the hnswlib-node native binding issues in Next.js dev mode
    try {
        const policyPath = path.join(process.cwd(), "docs", "it-policy.txt");
        const policyContent = fs.readFileSync(policyPath, "utf-8");

        // Simple keyword matching for demonstration
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes("vpn")) {
            return `Based on our IT policy: ${policyContent.match(/VPN Access:.*?\./)?.[0] || policyContent}`;
        } else if (lowerQuery.includes("password")) {
            return `Based on our IT policy: ${policyContent.match(/Password Reset:.*?\./)?.[0] || policyContent}`;
        } else {
            return `Here is what I found in our IT knowledge base: ${policyContent.substring(0, 300)}...`;
        }
    } catch (error) {
        return "I couldn't find any information about that in my knowledge base.";
    }
}
