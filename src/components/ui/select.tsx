import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value className="text-primary dark:text-dark-primary" {...props} />;
}

function SelectTrigger({
  children, className, size = "default", ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "xs" | "sm" | "default" }) {
  return (
    <div className={cn("relative", className)}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "flex w-full items-center justify-between gap-1 whitespace-nowrap rounded-lg border border-border bg-surface text-primary shadow-sm outline-none transition-colors duration-200 hover:bg-surface-container-low focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary dark:hover:bg-dark-surface",
          "data-[placeholder]:text-secondary dark:data-[placeholder]:text-on-tertiary-container",
          "data-[size=default]:h-10 data-[size=sm]:h-8 data-[size=xs]:h-6",
          "data-[size=default]:px-3 data-[size=sm]:px-2.5 data-[size=xs]:px-2",
          "data-[size=default]:text-sm data-[size=sm]:text-xs data-[size=xs]:text-[11px]"
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-4 text-secondary dark:text-on-tertiary-container">
            <path fill="currentColor" d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1" />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    </div>
  );
}

function SelectContent({
  className, children, ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 max-h-40 min-w-[4rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg text-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-primary",
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
        "mx-0.5 cursor-pointer rounded px-2 py-1 text-sm text-primary transition-colors duration-100 hover:bg-surface-container-low dark:text-dark-primary dark:hover:bg-dark-surface",
        "data-[highlighted]:bg-primary data-[highlighted]:text-on-primary dark:data-[highlighted]:bg-dark-primary dark:data-[highlighted]:text-primary",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("h-px bg-border dark:bg-dark-border", className)} {...props} />;
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-3 text-secondary dark:text-on-tertiary-container">
        <path fill="currentColor" d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1" />
      </svg>
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" className="size-3 text-secondary dark:text-on-tertiary-container">
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
