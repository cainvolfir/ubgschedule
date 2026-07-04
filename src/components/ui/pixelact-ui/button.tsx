import * as React from "react";
import { cn } from "@/lib/utils";
import "@/components/ui/pixelact-ui/styles/styles.css";
import "./button.css";

export interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "warning" | "success" | "destructive" | "link";
  size?: "sm" | "default" | "lg";
}

const variantClass: Record<string, string> = {
  default: "pixel-default__button",
  secondary: "pixel-secondary__button",
  warning: "pixel-warning__button",
  success: "pixel-success__button",
  destructive: "pixel-destructive__button",
  link: "pixel-link__button",
};

const sizeClass: Record<string, string> = {
  sm: "h-9 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "pixel__button inline-flex items-center justify-center gap-2 whitespace-nowrap",
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
