import { Produk } from "../produk/types";

export interface KnowledgeMatch {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  matchedProducts?: Produk[];
  matchedKnowledge?: KnowledgeMatch[];
  suggestions?: string[];
  isFromCache?: boolean;
}

export interface RagResponseData {
  message: string;
  matchedProducts: Produk[];
  matchedKnowledge?: KnowledgeMatch[];
  suggestions: string[];
  isFromCache?: boolean;
}

export interface SendChatMessagePayload {
  message: string;
  history?: {
    role: "user" | "assistant";
    content: string;
  }[];
}
