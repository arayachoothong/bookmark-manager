import type { ReactNode } from "react";

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
  requireAuth: boolean;
}
