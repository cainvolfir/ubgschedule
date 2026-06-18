import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card as ShadcnCard,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from "@/components/ui/card";
import "@/components/ui/pixelact-ui/styles/styles.css";

interface CardProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}

function Card({ className, ...props }: CardProps) {
  return (
    <ShadcnCard
      className={cn(
        "rounded-xl border border-[var(--border)] bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return <ShadcnCardHeader className={cn("flex flex-col", className)} {...props} />;
}

function CardTitle({ className, ...props }: CardProps) {
  return (
    <ShadcnCardTitle
      className={cn("font-semibold text-base", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardProps) {
  return <ShadcnCardDescription className={cn("text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }: CardProps) {
  return <ShadcnCardContent className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: CardProps) {
  return <ShadcnCardFooter className={cn("flex items-center", className)} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
