import { type VariantProps, cva } from "class-variance-authority";
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

export const cardVariants = cva("rounded-xl border", {
  variants: {
    font: {
      normal: "",
      pixel: "pixel-font",
    },
  },
  defaultVariants: {
    font: "pixel",
  },
});

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

function Card({ className, ...props }: CardProps) {
  return (
    <ShadcnCard
      className={cn(
        "rounded-xl border border-[var(--border)] bg-card backdrop-blur-xl shadow-md text-card-foreground transition-all duration-300 hover:shadow-lg hover:border-[var(--border-strong)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return <ShadcnCardHeader className={cn("", className)} {...props} />;
}

function CardTitle({ className, ...props }: CardProps) {
  return (
    <ShadcnCardTitle
      className={cn("font-normal text-lg", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardProps) {
  return <ShadcnCardDescription className={cn(className)} {...props} />;
}

function CardContent({ className, ...props }: CardProps) {
  return <ShadcnCardContent className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: CardProps) {
  return <ShadcnCardFooter className={cn(className)} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
