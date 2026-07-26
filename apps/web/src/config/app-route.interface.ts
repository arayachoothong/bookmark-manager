import type { ReactNode } from "react";

export type AppRouteLayout = "app" | "guest";

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
  requireAuth: boolean;
  layout: AppRouteLayout;
}
