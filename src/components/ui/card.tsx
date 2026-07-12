import type * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function Card({ className, raised = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        raised ? "glass-raised" : "glass",
        "rounded-3xl p-6",
        className,
      )}
      {...props}
    />
  );
}
