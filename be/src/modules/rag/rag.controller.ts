import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import {
  handleRagChat,
  handleRagChatStream,
  getRagSuggestions,
} from "./rag.service";

/**
 * Endpoint JSON Standar: POST /api/rag/chat
 */
export const askRag = catchAsync(async (req: Request, res: Response) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new AppError("Pesan pertanyaan tidak boleh kosong", 400);
  }

  const result = await handleRagChat(
    message.trim(),
    Array.isArray(history) ? history : []
  );

  return res.status(200).json({
    status: "success",
    data: result,
  });
});

/**
 * Endpoint Streaming SSE: POST /api/rag/chat/stream
 */
export const askRagStream = async (req: Request, res: Response): Promise<void> => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({
      status: "fail",
      message: "Pesan pertanyaan tidak boleh kosong",
    });
    return;
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  // Handle client abort / disconnect
  let isClientConnected = true;
  req.on("close", () => {
    isClientConnected = false;
  });

  try {
    const streamGenerator = handleRagChatStream(
      message.trim(),
      Array.isArray(history) ? history : []
    );

    for await (const event of streamGenerator) {
      if (!isClientConnected) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    if (isClientConnected) {
      res.end();
    }
  } catch (error: any) {
    console.error("SSE stream error:", error);
    if (isClientConnected) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          data: { message: "Terjadi kesalahan saat memproses streaming AI." },
        })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * Endpoint Suggestions: GET /api/rag/suggestions
 */
export const getSuggestions = catchAsync(async (_req: Request, res: Response) => {
  const suggestions = await getRagSuggestions();
  return res.status(200).json({
    status: "success",
    data: { suggestions },
  });
});
