import type { HTMLAttributes, ReactNode } from "react";

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: "row" | "column";
  children?: ReactNode;
};

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Stack({
  direction = "column",
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      className={joinClasses(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        "gap-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
