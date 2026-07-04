import * as React from "react";
import { cn } from "@/lib/utils";
import "@/components/ui/pixelact-ui/styles/styles.css";

interface CardProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}

function CardTitle({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("font-semibold text-base", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardProps) {
  return <div className={cn("text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }: CardProps) {
  return <div className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: CardProps) {
  return <div className={cn("flex items-center", className)} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
