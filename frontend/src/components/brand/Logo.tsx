import { cn } from "@/lib/utils";

const SIZES = {
  sm: { mark: "size-6 text-xs", word: "text-sm" },
  md: { mark: "size-8 text-sm", word: "text-lg" },
  lg: { mark: "size-11 text-lg", word: "text-2xl" },
} as const;

export function LogoMark({ className, size = "md" }: { className?: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary font-heading font-bold text-primary-foreground",
        SIZES[size].mark,
        className
      )}
      aria-hidden="true"
    >
      A
    </span>
  );
}

export function Logo({
  className,
  size = "md",
  iconOnly = false,
}: {
  className?: string;
  size?: keyof typeof SIZES;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {!iconOnly && (
        <span className={cn("font-heading font-semibold tracking-tight", SIZES[size].word)}>Abiriba</span>
      )}
    </span>
  );
}
