import type { Message } from "./types";

/** Quick replies offered under the agent's last message, by plan. */
export const FREE_PROMPTS = ["What is RNOR?", "Am I RNOR?", "What does the RNOR 9-of-10 test check?"];
export const PREMIUM_PROMPTS = [
  "What documents do I still need?",
  "When is my next deadline?",
  "What's my residency position?",
];

/** Opening message for an empty thread, matched to what the plan allows. */
export function welcomeMessage(firstName: string, tier: string): Message {
  return {
    id: 0,
    role: "assistant",
    content:
      tier === "free"
        ? `Hi ${firstName}, I'm Kiyos. On the free plan I can answer 3 general questions about India–US tax from our reviewed rules. Questions about your own situation need a plan, so a tax advisor can check the answer.`
        : `Hi ${firstName}, I'm Kiyos. Ask me anything about your case — I answer from your documents and our reviewed rules, and your case captain checks anything that needs judgement.`,
    created_at: new Date().toISOString(),
  };
}

