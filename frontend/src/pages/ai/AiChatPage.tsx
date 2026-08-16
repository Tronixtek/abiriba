import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError, resolveUploadUrl } from "@/lib/apiClient";
import {
  useAiChatMessages,
  useApplyAiProposal,
  useRejectAiProposal,
  useSendAiChatMessage,
} from "@/hooks/useAiChat";
import type { AiChatMessage, AiProposedItem } from "@/types";

type DraftItem = AiProposedItem & { include: boolean };

function ProposalCard({ message }: { message: AiChatMessage }) {
  const [items, setItems] = useState<DraftItem[]>(() =>
    (message.proposedActions ?? []).map((item) => ({ ...item, include: true }))
  );
  const apply = useApplyAiProposal();
  const reject = useRejectAiProposal();
  const isReviewed = message.status !== "PENDING";
  const displayItems = isReviewed ? message.proposedActions ?? [] : items;

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleApprove() {
    try {
      await apply.mutateAsync({ messageId: message.id, items });
      toast.success("Inventory updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to apply changes.");
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync(message.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject.");
    }
  }

  return (
    <Card size="sm" className="max-w-md">
      <CardContent className="space-y-3">
        <p className="text-sm">{message.content}</p>
        <div className="space-y-2">
          {displayItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              {!isReviewed && (
                <input
                  type="checkbox"
                  className="mt-2"
                  checked={items[i].include}
                  onChange={(e) => updateItem(i, { include: e.target.checked })}
                />
              )}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {isReviewed ? (
                    <span className="font-medium">{item.name}</span>
                  ) : (
                    <Input
                      value={items[i].name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="h-7 w-40 text-sm"
                    />
                  )}
                  <Badge variant={item.matchedProductId ? "secondary" : "outline"}>
                    {item.matchedProductId ? "Update stock" : "New product"}
                  </Badge>
                </div>
                {isReviewed ? (
                  <p className="text-xs text-muted-foreground">
                    Qty {item.quantity}
                    {item.unitPrice != null ? ` · ₦${item.unitPrice}` : ""}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={items[i].quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                      className="h-7 w-20 text-sm"
                      aria-label="Quantity"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      value={items[i].unitPrice ?? ""}
                      onChange={(e) =>
                        updateItem(i, {
                          unitPrice: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      className="h-7 w-28 text-sm"
                      aria-label="Unit price"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {isReviewed ? (
          <p className="text-xs text-muted-foreground">
            {message.status === "APPROVED" ? "✓ Applied to inventory" : "✗ Rejected — no changes made"}
          </p>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={apply.isPending || !items.some((item) => item.include)}
            >
              Approve selected
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject} disabled={reject.isPending}>
              Reject all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AiChatPage() {
  const { data: messages, isLoading } = useAiChatMessages();
  const send = useSendAiChatMessage();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [pending, setPending] = useState<{ content: string; imagePreviewUrl?: string } | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Count of messages present when a send started — the optimistic bubble
  // stays up until the real fetched list actually grows past it, so it
  // doesn't flash away before the refetch (triggered by the mutation's
  // onSuccess) has actually landed.
  const sendStartCountRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, pending]);

  useEffect(() => {
    if (
      pending &&
      sendStartCountRef.current !== null &&
      (messages?.length ?? 0) > sendStartCountRef.current
    ) {
      if (pending.imagePreviewUrl) URL.revokeObjectURL(pending.imagePreviewUrl);
      setPending(null);
      sendStartCountRef.current = null;
    }
  }, [messages, pending]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    const imagePreviewUrl = image ? URL.createObjectURL(image) : undefined;
    sendStartCountRef.current = messages?.length ?? 0;
    setPending({ content: trimmed, imagePreviewUrl });
    const imageToSend = image;
    setText("");
    setImage(null);

    try {
      await send.mutateAsync({ message: trimmed || undefined, image: imageToSend ?? undefined });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send message.");
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setPending(null);
      sendStartCountRef.current = null;
    }
  }

  return (
    <div className="flex h-[calc(100svh-6rem)] flex-col md:h-[calc(100svh-5rem)]">
      <div className="mb-4">
        <h1 className="font-heading text-xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Update inventory or ask about your business — sales, trends, and what to focus on. Nothing changes in
          your inventory until you review and approve it.
        </p>
      </div>
      <ScrollArea className="flex-1 rounded-lg border p-4">
        <div className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {messages?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Try "Add 10 bags of rice at 2500 naira", attach a receipt photo, or ask "How's business this
              month?"
            </p>
          )}
          {messages?.map((message) =>
            message.role === "USER" ? (
              <div key={message.id} className="flex flex-col items-end gap-1 self-end">
                {message.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setViewImageUrl(resolveUploadUrl(message.imageUrl))}
                    className="cursor-zoom-in transition-opacity hover:opacity-90"
                  >
                    <img
                      src={resolveUploadUrl(message.imageUrl) ?? undefined}
                      alt="Receipt"
                      className="max-h-40 rounded-md border object-cover"
                    />
                  </button>
                )}
                {message.content && (
                  <div className="max-w-md rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {message.content}
                  </div>
                )}
              </div>
            ) : message.status === "NONE" ? (
              <div key={message.id} className="max-w-md self-start rounded-lg bg-muted px-3 py-2 text-sm">
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="self-start">
                <ProposalCard message={message} />
              </div>
            )
          )}
          {pending && (
            <div className="flex flex-col items-end gap-1 self-end opacity-70">
              {pending.imagePreviewUrl && (
                <button
                  type="button"
                  onClick={() => setViewImageUrl(pending.imagePreviewUrl ?? null)}
                  className="cursor-zoom-in transition-opacity hover:opacity-90"
                >
                  <img
                    src={pending.imagePreviewUrl}
                    alt="Receipt"
                    className="max-h-40 rounded-md border object-cover"
                  />
                </button>
              )}
              {pending.content && (
                <div className="max-w-md rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {pending.content}
                </div>
              )}
              <span className="text-xs text-muted-foreground">Sending…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="mt-3 flex flex-col gap-2">
        {image && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="size-4" />
            {image.name}
            <button type="button" onClick={() => setImage(null)} aria-label="Remove photo">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach receipt photo"
          >
            <ImageIcon className="size-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add 10 bags of rice at 2500 naira…"
            className="min-h-10 flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button type="button" onClick={handleSend} disabled={send.isPending || (!text.trim() && !image)}>
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
      <Dialog open={!!viewImageUrl} onOpenChange={(open) => !open && setViewImageUrl(null)}>
        <DialogContent className="max-w-3xl p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">Receipt photo</DialogTitle>
          {viewImageUrl && (
            <img src={viewImageUrl} alt="Receipt" className="max-h-[80vh] w-full rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
