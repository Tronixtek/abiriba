import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/apiClient";
import { useInitializePayment, usePaymentStatus } from "@/hooks/usePayments";
import { CountdownTimer } from "@/components/storefront/CountdownTimer";
import type { Order, SafeHavenPaymentDetails } from "@/types";

function naira(n: string | number) {
  return `₦${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function detailsFromOrder(order: Order): SafeHavenPaymentDetails | null {
  if (!order.safeHavenAccountNumber || !order.safeHavenExpiresAt || !order.totalCharged) return null;
  return {
    accountNumber: order.safeHavenAccountNumber,
    accountName: null,
    bankName: order.safeHavenBankName ?? "Safe Haven MFB",
    totalCharged: order.totalCharged,
    expiresAt: order.safeHavenExpiresAt,
  };
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{value}</span>
    </div>
  );
}

// "Pay online" for a storefront order: gets a SafeHaven virtual account to
// transfer into, then watches for the transfer. Paying in person stays
// available alongside it.
export function OnlinePaymentCard({ slug, businessName, order }: { slug: string; businessName: string; order: Order }) {
  const [details, setDetails] = useState<SafeHavenPaymentDetails | null>(() => detailsFromOrder(order));
  const [expired, setExpired] = useState(() => {
    const existing = detailsFromOrder(order);
    return !!existing && new Date(existing.expiresAt).getTime() <= Date.now();
  });
  const initialize = useInitializePayment(slug);
  const payment = usePaymentStatus(slug, order.id, !!details && !expired);
  const status = payment.data?.status ?? order.status;

  async function startPayment() {
    try {
      const next = await initialize.mutateAsync(order.id);
      setDetails(next);
      setExpired(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start online payment. Please try again.");
    }
  }

  // One last check before giving up — a transfer that landed right at the
  // deadline still counts.
  function handleExpire() {
    payment.refetch().finally(() => setExpired(true));
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success("Account number copied.");
    } catch {
      toast.error("Couldn't copy — please copy it manually.");
    }
  }

  if (status === "PAID") {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col gap-1 py-4 text-left">
          <p className="font-semibold text-green-700 dark:text-green-400">Payment received — thank you!</p>
          <p className="text-sm text-muted-foreground">{businessName} can see that your order is paid.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "VOIDED") {
    return <p className="text-sm text-muted-foreground">This order was cancelled.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Card className="w-full">
        <CardContent className="flex flex-col gap-3 py-4 text-left">
          {!details || expired ? (
            <>
              {expired && (
                <p className="text-sm text-destructive">The payment window closed before a transfer came through.</p>
              )}
              <div>
                <p className="font-medium">Pay now by bank transfer</p>
                <p className="text-sm text-muted-foreground">
                  Get an account number to transfer to from any bank app.
                </p>
              </div>
              <Button onClick={startPayment} disabled={initialize.isPending}>
                {initialize.isPending ? "Preparing..." : expired ? "Get a new account number" : "Pay online"}
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">Transfer exactly this amount:</p>
              <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-3 text-sm">
                <DetailRow label="Bank" value={details.bankName} />
                {details.accountName && <DetailRow label="Account name" value={details.accountName} />}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Account number</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{details.accountNumber}</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => copyAccountNumber(details.accountNumber)}
                      aria-label="Copy account number"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </span>
                </div>
                <DetailRow label="Amount" value={naira(details.totalCharged)} strong />
              </div>
              <CountdownTimer key={details.expiresAt} expiresAt={details.expiresAt} onExpire={handleExpire} />
              <Button variant="outline" onClick={() => payment.refetch()} disabled={payment.isFetching}>
                {payment.isFetching ? "Checking..." : "I've sent it — check now"}
              </Button>
              {payment.error && (
                <p className="text-sm text-destructive">
                  {payment.error instanceof ApiError
                    ? payment.error.message
                    : "Couldn't check your payment. Please try again."}
                </p>
              )}
              <p className="text-xs text-muted-foreground">This page updates on its own once your transfer arrives.</p>
            </>
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Prefer to pay in person? Show this screen to a staff member at {businessName}.
      </p>
    </div>
  );
}
