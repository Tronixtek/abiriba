import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function StoreQrPage() {
  const { tenantSlug } = useAuth();
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const storeUrl = `${window.location.origin}/store/${tenantSlug}`;

  function downloadSvg() {
    const svg = svgWrapperRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "store-qr-code.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Store QR Code</h1>
        <p className="text-sm text-muted-foreground">
          Print this and place it at your counter or entrance. Customers scan it to browse your
          products and submit an order for you to confirm and collect payment for.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div ref={svgWrapperRef} className="rounded-md border p-4">
            <QRCodeSVG value={storeUrl} size={220} />
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <Input readOnly value={storeUrl} onFocus={(e) => e.target.select()} />
          </div>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              Copy link
            </Button>
            <Button className="flex-1" onClick={downloadSvg}>
              Download SVG
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
