import type { HTMLAttributes, ReactNode } from "react";

import { hasGapClass, joinClasses } from "./join-classes";

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: "row" | "column";
  children?: ReactNode;
};

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
        !hasGapClass(className) ? "gap-4" : undefined,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
