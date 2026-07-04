import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import "@/components/ui/pixelact-ui/styles/styles.css";

export const inputVariants = cva("text-foreground", {
  variants: {
    font: { normal: "", pixel: "pixel-font" },
  },
  defaultVariants: { font: "pixel" },
});

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;

function SelectValue({ font, ...props }: React.ComponentProps<typeof SelectPrimitive.Value> & VariantProps<typeof inputVariants>) {
  return <SelectPrimitive.Value className={cn(inputVariants({ font }))} {...props} />;
}

function SelectTrigger({
  children, className, font, size = "default", ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "xs" | "sm" | "default"; font?: "normal" | "pixel" }) {
  return (
    <div className={cn("relative", inputVariants({ font }), className)}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "rounded border border-[var(--border)] ring-0 w-full bg-[var(--surface)] data-[placeholder]:text-[var(--text-faint)] flex items-center justify-between gap-1 whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--primary)] hover:border-[var(--border-strong)] text-[var(--text)] shadow-none",
          "data-[size=default]:h-10 data-[size=sm]:h-7 data-[size=xs]:h-5",
          "data-[size=default]:px-3 data-[size=sm]:px-2 data-[size=xs]:px-1.5",
          "data-[size=default]:text-sm data-[size=sm]:text-xs data-[size=xs]:text-[9px]",
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
          "relative z-50 max-h-40 min-w-[4rem] rounded border border-[var(--border)] shadow-lg overflow-hidden text-[var(--text)] bg-[var(--surface)]",
          inputVariants({ font }),
          className
        )}
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
  return <SelectPrimitive.Label className={cn(className)} {...props} />;
}

function SelectItem({
  className, children, ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "rounded px-2 py-1 mx-0.5 cursor-pointer transition-colors duration-100 text-[9px]",
        "bg-[var(--surface)] text-[var(--text)]",
        "hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        "data-[highlighted]:bg-[var(--blue)] data-[highlighted]:text-white",
        "active:bg-[var(--blue)] active:text-white",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn(className)} {...props} />;
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
