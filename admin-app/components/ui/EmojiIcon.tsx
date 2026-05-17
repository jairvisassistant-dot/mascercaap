type EmojiIconSize = "sm" | "md" | "lg" | "xl";
type EmojiIconTone = "brand" | "fruit" | "service" | "success" | "danger" | "neutral" | "plain";

const sizeClasses: Record<EmojiIconSize, string> = {
  sm: "size-6 text-base",
  md: "size-8 text-xl",
  lg: "size-10 text-2xl",
  xl: "size-12 text-3xl",
};

const toneClasses: Record<EmojiIconTone, string> = {
  brand: "bg-accent/12 text-accent ring-accent/20",
  fruit: "bg-white/14 text-white ring-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
  service: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-green-100 text-green-700 ring-green-200",
  danger: "bg-red-100 text-red-700 ring-red-200",
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  plain: "bg-transparent text-current ring-transparent",
};

interface EmojiIconProps {
  emoji: string;
  label?: string;
  decorative?: boolean;
  size?: EmojiIconSize;
  tone?: EmojiIconTone;
  mirrored?: boolean;
  className?: string;
}

export default function EmojiIcon({
  emoji,
  label,
  decorative = true,
  size = "md",
  tone = "plain",
  mirrored = false,
  className = "",
}: EmojiIconProps) {
  const accessibilityProps = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": label ?? emoji };

  return (
    <span
      {...accessibilityProps}
      className={`inline-grid shrink-0 place-items-center rounded-full align-middle leading-none ring-1 ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
    >
      <span className={`block leading-none ${mirrored ? "scale-x-[-1]" : ""}`}>
        {emoji}
      </span>
    </span>
  );
}
