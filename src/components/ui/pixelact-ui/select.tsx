import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectGroup as ShadcnSelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel as ShadcnSelectLabel,
  SelectSeparator as ShadcnSelectSeparator,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";

import "@/components/ui/pixelact-ui/styles/styles.css";

export const inputVariants = cva("text-oklch(0.141 0.005 285.823) dark:text-oklch(0.985 0 0)", {
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

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean;
}

function Select({ ...props }: React.ComponentProps<typeof ShadcnSelect>) {
  return <ShadcnSelect {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <ShadcnSelectGroup {...props} />;
}

interface SelectValueProps
  extends React.ComponentProps<typeof SelectPrimitive.Value>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean;
}

function SelectValue({ font, ...props }: SelectValueProps) {
  return (
    <ShadcnSelectValue className={cn(inputVariants({ font }))} {...props} />
  );
}

function SelectTrigger({
  children,
  className,
  font,
  size = "default",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
  font?: "normal" | "pixel";
}) {
  return (
    <div
      className={cn(
        "relative shadow-(--pixel-box-shadow) box-shadow-margin",
        inputVariants({ font }),
        className
      )}
    >
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "rounded-none bg-gray-100 dark:bg-zinc-800 ring-0 w-full border-0 data-[placeholder]:text-zinc-400 dark:data-[placeholder]:text-zinc-500 [&_svg:not([class*='text-'])]:text-zinc-400 dark:[&_svg:not([class*='text-'])]:text-zinc-500 flex items-center justify-between gap-2 px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 text-zinc-800 dark:text-zinc-100",
          className
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 24"
            className="size-6 opacity-50"
          >
            <path
              className="fill-foreground"
              d="M7 8H5v2h2v2h2v2h2v2h2v-2h2v-2h2v-2h2V8h-2v2h-2v2h-2v2h-2v-2H9v-2H7z"
            />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    </div>
  );
}

export interface SelectContentProps
  extends React.ComponentProps<typeof SelectPrimitive.Content>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean;
}

function SelectContent({
  className,
  children,
  font,
  ...props
}: SelectContentProps) {
  return (
      <ShadcnSelectContent
        className={cn(
          "relative z-50 max-h-60 bg-gray-100 dark:bg-zinc-800 rounded-none border-none shadow-(--pixel-box-shadow) mt-2 text-zinc-800 dark:text-zinc-100",
          inputVariants({ font }),
          className
        )}
        {...props}
      >
      {children}
    </ShadcnSelectContent>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <ShadcnSelectLabel className={cn(className)} {...props} />;
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <ShadcnSelectItem
      className={cn(
        className,
        "rounded-none px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 data-[highlighted]:bg-gray-200 dark:data-[highlighted]:bg-zinc-700 data-[highlighted]:text-zinc-900 dark:data-[highlighted]:text-zinc-100"
      )}
      {...props}
    >
      {children}
    </ShadcnSelectItem>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <ShadcnSelectSeparator className={cn(className)} {...props} />;
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 24"
        className="size-4"
      >
        <path
          className="fill-foreground"
          d="M7 8H5v2h2v2h2v2h2v2h2v-2h2v-2h2v-2h2V8h-2v2h-2v2h-2v2h-2v-2H9v-2H7z"
        />
      </svg>
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 24"
        className="size-4"
      >
        <path
          className="fill-foreground"
          d="M7 16H5v-2h2v-2h2v-2h2V8h2v2h2v2h2v2h2v2h-2v-2h-2v-2h-2v-2h-2v2H9v2H7z"
        />
      </svg>
    </SelectPrimitive.ScrollUpButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
