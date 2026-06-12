import { getOrigin } from "../../lib/leadOrigins";

interface OriginBadgeProps {
  value: string;
  size?: "sm" | "md";
  /** Esconde o texto e mostra só o logo (com title acessível). */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Pílula com o logo da origem (em cores de marca) + rótulo.
 * Resolve valores legados automaticamente via getOrigin().
 */
export default function OriginBadge({
  value,
  size = "sm",
  iconOnly = false,
  className = "",
}: OriginBadgeProps) {
  const origin = getOrigin(value);
  const { Icon } = origin;

  const pill =
    size === "md"
      ? "gap-2 px-3 py-1.5 text-sm"
      : "gap-1.5 px-2.5 py-1 text-xs";
  const iconSize = size === "md" ? "h-6 w-6" : "h-[18px] w-[18px]";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${pill} ${className}`}
      style={{ background: origin.bg, color: origin.color }}
      title={origin.label}
    >
      <Icon className={`${iconSize} shrink-0`} />
      {!iconOnly && origin.label}
    </span>
  );
}
