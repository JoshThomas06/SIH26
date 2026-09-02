export function cn(...parts: Array<string | false | null | undefined>) {
 return parts.filter(Boolean).join(" ");
}

const ASSET_PREFIX = "/landing/";

export function withBase(src: string): string {
 return src.replace(/(^|[,\s])\//g, (_, sep) => sep + ASSET_PREFIX);
}
