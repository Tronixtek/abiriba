import fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slug.js";
import { env } from "../../config/env.js";
import * as productsService from "../products/products.service.js";
import * as reportsService from "../reports/reports.service.js";

const ai = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        "A friendly message to show the vendor. Keep it to one or two sentences for inventory confirmations; a few sentences or a short list is fine for business/growth questions.",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The product name, as written on the receipt or message." },
          quantity: { type: Type.INTEGER, description: "Number of units." },
          unitPrice: { type: Type.NUMBER, description: "Price per single unit in Naira, if stated." },
        },
        required: ["name", "quantity"],
      },
    },
  },
  required: ["reply", "items"],
};

const SYSTEM_PROMPT = `You are an inventory and business assistant for a small shop's point-of-sale app. You have two jobs:

1. Inventory updates: when the vendor sends an instruction or a photo of a supplier receipt, extract every distinct line item as { name, quantity, unitPrice }. "unitPrice" is the price per single unit, not the line total — divide if the receipt only shows a line total. If unitPrice truly isn't determinable, omit it (name and quantity are always required). Never invent items that aren't actually there. Keep "reply" to a short, friendly summary for these.

2. Business insight and growth advice: when the vendor asks about sales, trends, what's selling, what to restock, or how to grow the business, answer using the CURRENT BUSINESS SNAPSHOT provided below — it is real, current data for this specific shop. Reference actual numbers and product names from the snapshot rather than generic advice. It's fine for "reply" to be a few sentences or a short list here. Return an empty items array for these — insight questions never propose inventory changes.

If the message is neither of the above (e.g. a greeting), reply conversationally with an empty items array. Never claim a number that isn't in the snapshot or the vendor's own message.`;

interface BusinessSnapshotLowStockItem {
  name: string;
  quantity: number;
  lowStockThreshold: number;
}

async function buildBusinessSnapshot(tenantId: string) {
  const [monthReport, last7Days, lowStock, activeProductCount, customerCount] = await Promise.all([
    reportsService.getSalesReport({ tenantId, range: "month" }),
    reportsService.getSalesTrends({ tenantId, days: 7 }),
    productsService.getLowStockProducts(tenantId) as Promise<BusinessSnapshotLowStockItem[]>,
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.customer.count({ where: { tenantId } }),
  ]);

  return {
    thisMonth: {
      totalRevenue: monthReport.totalRevenue,
      orderCount: monthReport.orderCount,
      itemsSold: monthReport.itemsSold,
      topProducts: monthReport.topProducts
        .slice(0, 5)
        .map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue })),
    },
    last7Days: last7Days.map((d) => ({ date: d.date, revenue: d.revenue, transactions: d.transactions })),
    lowStock: lowStock.slice(0, 10).map((p) => ({ name: p.name, quantity: p.quantity, threshold: p.lowStockThreshold })),
    activeProductCount,
    customerCount,
  };
}

interface ProposedItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  matchedProductId?: string | null;
}

function isTransientGenAiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /503|UNAVAILABLE|high demand|ConnectTimeout|fetch failed|ETIMEDOUT|ECONNRESET/i.test(message);
}

// Gemini occasionally 503s under load or the connection times out — both are
// transient, so one retry clears most of them instead of surfacing an error
// to the vendor for something a second later.
async function generateContentWithRetry(params: Parameters<typeof ai.models.generateContent>[0]) {
  try {
    return await ai.models.generateContent(params);
  } catch (err) {
    if (!isTransientGenAiError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return ai.models.generateContent(params);
  }
}

export async function listChatMessages(tenantId: string) {
  return prisma.aiChatMessage.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

async function findUniqueSkuForName(tenantId: string, name: string): Promise<string> {
  const base = slugify(name);
  let sku = base;
  while (await prisma.product.findFirst({ where: { tenantId, sku } })) {
    sku = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return sku;
}

export async function sendChatMessage(params: {
  tenantId: string;
  userId: string;
  text?: string;
  imageFile?: Express.Multer.File;
}) {
  const trimmedText = params.text?.trim();
  const userContent = trimmedText || "Sent a receipt photo.";
  const imageUrl = params.imageFile
    ? `/uploads/receipts/${params.tenantId}/${params.imageFile.filename}`
    : undefined;

  await prisma.aiChatMessage.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      role: "USER",
      content: userContent,
      imageUrl,
    },
  });

  try {
    const snapshot = await buildBusinessSnapshot(params.tenantId);
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      {
        text: `${SYSTEM_PROMPT}\n\nCURRENT BUSINESS SNAPSHOT (JSON):\n${JSON.stringify(snapshot)}\n\nVendor message: ${trimmedText || "(no text, see attached photo)"}`,
      },
    ];
    if (params.imageFile) {
      const data = fs.readFileSync(params.imageFile.path).toString("base64");
      parts.push({ inlineData: { mimeType: params.imageFile.mimetype, data } });
    }

    const response = await generateContentWithRetry({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as { reply?: string; items?: ProposedItem[] };
    const rawItems = (parsed.items ?? []).filter((item) => item.name && item.quantity > 0);

    const items: ProposedItem[] = [];
    for (const item of rawItems) {
      const existing = await prisma.product.findFirst({
        where: { tenantId: params.tenantId, name: { equals: item.name, mode: "insensitive" } },
        select: { id: true },
      });
      items.push({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        matchedProductId: existing?.id ?? null,
      });
    }

    return await prisma.aiChatMessage.create({
      data: {
        tenantId: params.tenantId,
        role: "ASSISTANT",
        content: parsed.reply || "Here's what I found.",
        proposedActions: items.length > 0 ? (items as unknown as object[]) : undefined,
        status: items.length > 0 ? "PENDING" : "NONE",
      },
    });
  } catch (err) {
    console.error("AI chat parse failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isQuotaError = /429|RESOURCE_EXHAUSTED|quota/i.test(message);
    return await prisma.aiChatMessage.create({
      data: {
        tenantId: params.tenantId,
        role: "ASSISTANT",
        content: isQuotaError
          ? "The AI assistant is receiving too many requests right now (rate limit). Please wait about a minute and try again."
          : "Sorry, something went wrong reading that. Please try again.",
        status: "NONE",
      },
    });
  }
}

export async function applyProposal(params: {
  tenantId: string;
  userId: string;
  messageId: string;
  items: Array<{ name: string; quantity: number; unitPrice?: number; include: boolean }>;
}) {
  const message = await prisma.aiChatMessage.findFirst({
    where: { id: params.messageId, tenantId: params.tenantId },
  });
  if (!message) {
    throw new AppError(404, "Message not found.");
  }
  if (message.status !== "PENDING") {
    throw new AppError(409, "This proposal has already been reviewed.");
  }

  const products = [];
  for (const item of params.items) {
    if (!item.include) continue;

    const existing = await prisma.product.findFirst({
      where: { tenantId: params.tenantId, name: { equals: item.name, mode: "insensitive" } },
    });

    if (existing) {
      products.push(
        await productsService.adjustStock({
          tenantId: params.tenantId,
          userId: params.userId,
          productId: existing.id,
          delta: item.quantity,
          reason: "RESTOCK",
          note: "Added via AI chat",
        })
      );
    } else {
      const sku = await findUniqueSkuForName(params.tenantId, item.name);
      products.push(
        await productsService.createProduct({
          tenantId: params.tenantId,
          sku,
          name: item.name,
          price: item.unitPrice ?? 0,
          quantity: item.quantity,
          lowStockThreshold: 5,
        })
      );
    }
  }

  const updatedMessage = await prisma.aiChatMessage.update({
    where: { id: message.id },
    data: { status: "APPROVED", reviewedById: params.userId, reviewedAt: new Date() },
  });

  return { message: updatedMessage, products };
}

export async function rejectProposal(params: { tenantId: string; userId: string; messageId: string }) {
  const message = await prisma.aiChatMessage.findFirst({
    where: { id: params.messageId, tenantId: params.tenantId },
  });
  if (!message) {
    throw new AppError(404, "Message not found.");
  }
  if (message.status !== "PENDING") {
    throw new AppError(409, "This proposal has already been reviewed.");
  }
  return prisma.aiChatMessage.update({
    where: { id: message.id },
    data: { status: "REJECTED", reviewedById: params.userId, reviewedAt: new Date() },
  });
}
