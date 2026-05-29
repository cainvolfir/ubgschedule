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
          "rounded-none bg-oklch(1 0 0) dark:bg-oklch(1 0 0) ring-0 w-full border-0 border-oklch(0.92 0.004 286.32) data-[placeholder]:text-oklch(0.552 0.016 285.938) [&_svg:not([class*='text-'])]:text-oklch(0.552 0.016 285.938) focus-visible:border-oklch(0.705 0.015 286.067) focus-visible:ring-oklch(0.705 0.015 286.067)/50 aria-invalid:ring-oklch(0.577 0.245 27.325)/20 dark:aria-invalid:ring-oklch(0.577 0.245 27.325)/40 aria-invalid:border-oklch(0.577 0.245 27.325) dark:hover:bg-oklch(0.92 0.004 286.32)/50 flex items-center justify-between gap-2 px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 dark:bg-oklch(0.141 0.005 285.823) dark:dark:bg-oklch(0.141 0.005 285.823) dark:border-oklch(1 0 0 / 15%) dark:data-[placeholder]:text-oklch(0.705 0.015 286.067) dark:[&_svg:not([class*='text-'])]:text-oklch(0.705 0.015 286.067) dark:focus-visible:border-oklch(0.552 0.016 285.938) dark:focus-visible:ring-oklch(0.552 0.016 285.938)/50 dark:aria-invalid:ring-oklch(0.704 0.191 22.216)/20 dark:dark:aria-invalid:ring-oklch(0.704 0.191 22.216)/40 dark:aria-invalid:border-oklch(0.704 0.191 22.216) dark:dark:hover:bg-oklch(1 0 0 / 15%)/50",
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
          "relative bg-oklch(1 0 0) rounded-none border-none shadow-(--pixel-box-shadow) mt-2 dark:bg-oklch(0.272 0.006 286.033) text-oklch(0.141 0.005 285.823) dark:text-oklch(0.985 0 0)",
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
        "rounded-none border-y-3 border-dashed border-oklch(0.705 0.015 286.067)/0 data-[highlighted]:bg-oklch(0.92 0.004 286.32) dark:data-[highlighted]:bg-oklch(0.272 0.006 286.033) text-oklch(0.141 0.005 285.823) dark:text-oklch(0.985 0 0) hover:border-oklch(0.141 0.005 285.823) dark:hover:border-oklch(0.705 0.015 286.067) dark:border-oklch(0.552 0.016 285.938)/0 dark:hover:border-oklch(0.985 0 0) dark:dark:hover:border-oklch(0.552 0.016 285.938)"
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
