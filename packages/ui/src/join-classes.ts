export function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function hasGapClass(className?: string): boolean {
  return Boolean(className && /\bgap-/.test(className));
}
