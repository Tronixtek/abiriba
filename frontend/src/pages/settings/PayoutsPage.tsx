import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/apiClient";
import {
  usePayouts,
  useSettlementBanks,
  useSettlementSettings,
  useUpdateSettlementSettings,
  useVerifySettlementAccount,
} from "@/hooks/useSettlementSettings";
import type { PayoutStatus, SettlementMode } from "@/types";

function naira(n: string | number) {
  return `₦${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_VARIANT: Record<PayoutStatus, "default" | "secondary" | "destructive"> = {
  SUCCESS: "default",
  PENDING: "secondary",
  PROCESSING: "secondary",
  FAILED: "destructive",
};

const MODE_OPTIONS: { value: SettlementMode; label: string; description: string }[] = [
  {
    value: "END_OF_DAY",
    label: "End of day",
    description: "All of the day's online payments are sent to your account in one transfer each night. No fee.",
  },
  {
    value: "INSTANT",
    label: "Instant",
    description:
      "Each online payment is sent to your account as soon as it's confirmed. The bank transfer fee plus 7.5% VAT and a ₦10 service fee are deducted from each payout.",
  },
];

export function PayoutsPage() {
  const { data: settings, isLoading } = useSettlementSettings();
  const { data: banks, isLoading: banksLoading } = useSettlementBanks();
  const { data: payouts } = usePayouts();
  const verify = useVerifySettlementAccount();
  const update = useUpdateSettlementSettings();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [mode, setMode] = useState<SettlementMode>("END_OF_DAY");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setBankCode(settings.settlementBankCode ?? "");
    setAccountNumber(settings.settlementAccountNumber ?? "");
    setMode(settings.settlementMode);
    setVerifiedName(null);
  }, [settings]);

  const bankDetailsChanged =
    bankCode !== (settings?.settlementBankCode ?? "") || accountNumber !== (settings?.settlementAccountNumber ?? "");
  const displayedName = bankDetailsChanged ? verifiedName : (settings?.settlementAccountName ?? null);
  const accountNumberValid = /^\d{10}$/.test(accountNumber);
  const modeChanged = mode !== settings?.settlementMode;
  const canSave =
    !update.isPending && (bankDetailsChanged ? !!bankCode && accountNumberValid && !!verifiedName : modeChanged);

  async function handleVerify() {
    try {
      const result = await verify.mutateAsync({ bankCode, accountNumber });
      setVerifiedName(result.accountName);
    } catch (err) {
      setVerifiedName(null);
      toast.error(err instanceof ApiError ? err.message : "Couldn't verify that account.");
    }
  }

  async function handleSave() {
    try {
      await update.mutateAsync({
        settlementMode: mode,
        ...(bankDetailsChanged ? { bankCode, accountNumber } : {}),
      });
      toast.success("Payout settings saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save payout settings.");
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Where your share of customers' online payments is sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank">Bank</Label>
            <Select
              value={bankCode}
              onValueChange={(value) => {
                setBankCode(value);
                setVerifiedName(null);
              }}
              disabled={banksLoading}
            >
              <SelectTrigger id="bank" className="w-full">
                <SelectValue placeholder={banksLoading ? "Loading banks…" : "Select your bank"} />
              </SelectTrigger>
              <SelectContent>
                {banks?.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                setVerifiedName(null);
              }}
              placeholder="10-digit account number"
            />
          </div>
          {bankDetailsChanged && (
            <Button
              type="button"
              variant="outline"
              onClick={handleVerify}
              disabled={!bankCode || !accountNumberValid || verify.isPending}
            >
              {verify.isPending ? "Checking…" : "Verify account"}
            </Button>
          )}
          {displayedName && (
            <p className="text-sm">
              Account name: <span className="font-semibold">{displayedName}</span>
            </p>
          )}
          {bankDetailsChanged && !verifiedName && (
            <p className="text-xs text-muted-foreground">Verify the account to confirm its name before saving.</p>
          )}
          {!settings?.settlementAccountNumber && !bankDetailsChanged && (
            <p className="text-xs text-muted-foreground">Add a bank account to start receiving payouts.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-checked:border-primary"
            >
              <input
                type="radio"
                name="settlementMode"
                className="mt-1"
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={!canSave}>
        {update.isPending ? "Saving…" : "Save payout settings"}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {!payouts?.length ? (
            <p className="text-sm text-muted-foreground">
              No payouts yet — they'll appear here once customers pay online.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Deducted</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => {
                    // Only what actually came out of the vendor's share — an
                    // end-of-day fee the platform absorbed isn't shown as a deduction.
                    const deducted =
                      payout.transferredAmount !== null
                        ? Number(payout.amount) - Number(payout.transferredAmount)
                        : null;
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{payout._count.orders}</TableCell>
                        <TableCell className="text-right">{naira(payout.amount)}</TableCell>
                        <TableCell className="text-right">
                          {deducted !== null && deducted > 0 ? naira(deducted) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payout.transferredAmount !== null ? naira(payout.transferredAmount) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[payout.status]}>{payout.status}</Badge>
                          {payout.failureReason && payout.status !== "SUCCESS" && (
                            <p className="mt-1 max-w-48 text-xs text-muted-foreground">{payout.failureReason}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
