import { cva, VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 text-center font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-foreground/90",
        green: "bg-success text-white hover:bg-success/90",
        dark: "bg-dark text-white hover:bg-dark/90",
        outlinePrimary:
          "border-2 border-border text-foreground hover:bg-muted",
        outlineGreen: "border-2 border-border text-success hover:bg-success/10",
        outlineDark:
          "border-2 border-border text-foreground hover:bg-muted",
      },
      shape: {
        default: "rounded-md",
        rounded: "rounded-md",
        full: "rounded-full",
      },
      size: {
        default: "py-3.5 px-10 py-3.5 lg:px-8 xl:px-10",
        small: "py-[11px] px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      shape: "default",
      size: "default",
    },
  },
);

type ButtonProps = HTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    icon?: React.ReactNode;
  };

export function Button({
  label,
  icon,
  variant,
  shape,
  size,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, shape, size, className })}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
