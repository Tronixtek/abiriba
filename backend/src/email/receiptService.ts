import { prisma } from "../db/prismaClient.js";
import { Prisma } from "../generated/prisma/client.js";
import { getTransport, isEmailConfigured } from "./mailer.js";
import { renderReceiptHtml } from "./receiptTemplate.js";
import { env } from "../config/env.js";

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true; payment: true; customer: true };
}>;

/**
 * Deliberately decoupled from the pay transaction itself (called after
 * commit, never awaited by the checkout response) — a slow or failed SMTP
 * send must never block or roll back a sale that's already been recorded.
 */
export async function sendReceiptEmail(order: OrderWithRelations): Promise<void> {
  const email = order.customer?.email;
  if (!email) {
    await prisma.order.update({ where: { id: order.id }, data: { receiptStatus: "NOT_APPLICABLE" } });
    return;
  }

  if (!isEmailConfigured()) {
    console.warn(`SMTP not configured — skipping receipt email for order ${order.id}.`);
    await prisma.order.update({ where: { id: order.id }, data: { receiptStatus: "FAILED" } });
    return;
  }

  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: order.tenantId } });
    const html = renderReceiptHtml({
      businessName: tenant.businessName,
      customerName: order.customer!.name,
      items: order.items,
      total: order.total,
      paymentMethod: order.payment?.method ?? "-",
      paidAt: order.paidAt,
    });

    await getTransport().sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: `Receipt from ${tenant.businessName}`,
      html,
    });

    await prisma.order.update({ where: { id: order.id }, data: { receiptStatus: "SENT" } });
  } catch (err) {
    console.error(`Failed to send receipt email for order ${order.id}`, err);
    await prisma.order.update({ where: { id: order.id }, data: { receiptStatus: "FAILED" } }).catch(() => undefined);
  }
}
