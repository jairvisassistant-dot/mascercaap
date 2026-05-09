import EmojiIcon from "@/components/ui/EmojiIcon";

interface BrandFruitMarkProps {
  className?: string;
}

export default function BrandFruitMark({ className = "" }: BrandFruitMarkProps) {
  return (
    <EmojiIcon
      emoji="🍋"
      label="Limón"
      decorative
      mirrored
      size="sm"
      tone="brand"
      className={className}
    />
  );
}
