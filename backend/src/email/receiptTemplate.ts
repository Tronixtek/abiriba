interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
}

function money(n: unknown): string {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderReceiptHtml(params: {
  businessName: string;
  customerName: string;
  items: ReceiptItem[];
  total: unknown;
  paymentMethod: string;
  paidAt: Date | null;
}): string {
  const { businessName, customerName, items, total, paymentMethod, paidAt } = params;
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${item.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(item.unitPrice)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#111;">
    <h2 style="margin-bottom:0;">${businessName}</h2>
    <p style="color:#666;margin-top:4px;">Receipt for ${customerName}</p>
    <p style="color:#666;font-size:13px;">${paidAt?.toLocaleString() ?? ""}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr style="text-align:left;border-bottom:2px solid #111;">
          <th style="padding:6px 8px;">Item</th>
          <th style="padding:6px 8px;text-align:center;">Qty</th>
          <th style="padding:6px 8px;text-align:right;">Price</th>
          <th style="padding:6px 8px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:12px;font-size:18px;font-weight:600;">
      Total: ${money(total)}
    </div>
    <p style="color:#666;font-size:13px;margin-top:24px;">Payment method: ${paymentMethod}</p>
    <p style="color:#999;font-size:12px;margin-top:24px;">Thank you for your purchase.</p>
  </div>`;
}
