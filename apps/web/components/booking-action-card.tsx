import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = Readonly<{
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
  compact?: boolean;
  className?: string;
}>;

export function BookingActionCard({icon:Icon,eyebrow,title,description,children,footer,tone="default",compact=false,className=""}:Props) {
  const classes = ["bookingActionCard", tone === "danger" ? "bookingActionCardDanger" : "", compact ? "bookingActionCardCompact" : "", className].filter(Boolean).join(" ");
  return <section className={classes}>
    <header className="bookingActionHeader">
      <span className="bookingActionIcon"><Icon size={20}/></span>
      <div>
        <span className="bookingActionEyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </header>
    <div className="bookingActionBody">{children}</div>
    {footer && <footer className="bookingActionFooter">{footer}</footer>}
  </section>;
}
