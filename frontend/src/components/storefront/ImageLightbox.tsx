import { useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 40;

export function ImageLightbox({
  images,
  initialIndex,
  productName,
  open,
  onOpenChange,
}: {
  images: string[];
  initialIndex: number;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function show(i: number) {
    setIndex((i + images.length) % images.length);
  }

  function handleTouchStart(e: TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta > SWIPE_THRESHOLD_PX) show(index - 1);
    else if (delta < -SWIPE_THRESHOLD_PX) show(index + 1);
    setTouchStartX(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setIndex(initialIndex);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md p-0" showCloseButton>
        <DialogTitle className="sr-only">{productName} photos</DialogTitle>
        <div
          className="relative aspect-square w-full touch-pan-y select-none overflow-hidden rounded-lg bg-muted"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img src={images[index]} alt={`${productName} photo ${index + 1}`} className="size-full object-contain" />

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => show(index - 1)}
                className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => show(index + 1)}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={cn("size-1.5 rounded-full bg-foreground/40", i === index && "bg-foreground")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
