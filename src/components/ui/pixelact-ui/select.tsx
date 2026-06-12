import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Select as ShadcnSelect,
  SelectGroup as ShadcnSelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel as ShadcnSelectLabel,
  SelectSeparator as ShadcnSelectSeparator,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";
import "@/components/ui/pixelact-ui/styles/styles.css";

export const inputVariants = cva("text-foreground", {
  variants: {
    font: { normal: "", pixel: "pixel-font" },
  },
  defaultVariants: { font: "pixel" },
});

function Select({ ...props }: React.ComponentProps<typeof ShadcnSelect>) {
  return <ShadcnSelect {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <ShadcnSelectGroup {...props} />;
}

function SelectValue({ font, ...props }: React.ComponentProps<typeof SelectPrimitive.Value> & VariantProps<typeof inputVariants>) {
  return <ShadcnSelectValue className={cn(inputVariants({ font }))} {...props} />;
}

function SelectTrigger({
  children, className, font, size = "default", ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "sm" | "default"; font?: "normal" | "pixel" }) {
  return (
    <div className={cn("relative", inputVariants({ font }), className)}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        data-size={size}
        style={{ backgroundColor: 'var(--card-solid)' }}
        className={cn(
          "rounded-lg border-2 border-[var(--border)] ring-0 w-full data-[placeholder]:text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--primary)] hover:border-[var(--border-strong)] data-[size=default]:h-10 data-[size=sm]:h-9 text-card-foreground shadow-sm hover:shadow-md",
          className
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-4 text-muted-foreground">
            <path fill="currentColor" d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1" />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    </div>
  );
}

function SelectContent({
  className, children, font, ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & VariantProps<typeof inputVariants>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 max-h-60 min-w-[8rem] rounded-xl border-2 border-[var(--border)] shadow-xl overflow-hidden text-card-foreground",
          inputVariants({ font }),
          className
        )}
        style={{ backgroundColor: 'var(--card-solid)' }}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <ShadcnSelectLabel className={cn(className)} {...props} />;
}

function SelectItem({
  className, children, ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <ShadcnSelectItem
      className={cn(
        "rounded-lg px-2.5 py-1.5 mx-0.5 text-card-foreground cursor-pointer transition-colors duration-100 hover:bg-muted data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground !pl-2.5",
        className
      )}
      style={{ backgroundColor: 'var(--card-solid)' }}
      {...props}
    >
      {children}
    </ShadcnSelectItem>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <ShadcnSelectSeparator className={cn(className)} {...props} />;
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-3 text-muted-foreground">
        <path fill="currentColor" d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1" />
      </svg>
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-3 text-muted-foreground">
        <path fill="currentColor" d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1" />
      </svg>
    </SelectPrimitive.ScrollUpButton>
  );
}

export {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectScrollDownButton, SelectScrollUpButton, SelectSeparator,
  SelectTrigger, SelectValue,
};
