import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-input bg-white/90 px-4 py-2 text-base text-slate-900 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-400",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
