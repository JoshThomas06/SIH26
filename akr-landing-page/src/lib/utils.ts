export function cn(...parts: Array<string | false | null | undefined>) {
 return parts.filter(Boolean).join(" ");
}

export function withBase(src: string): string {
 return src.replace(/(^|[,\s])\//g, (_, sep) => sep + import.meta.env.BASE_URL);
}
