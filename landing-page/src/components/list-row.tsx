import type { ListRowStyles } from "../_styles";
import { cn } from "../lib/utils";
export type ListRowData = {
 href: string;
 label: string;
 label2: string;
};
/** A list row. */
export default function ListRow({ d, cids, styles }: { d: ListRowData; cids: string[]; styles: ListRowStyles }) {
 return (
 <li data-cid={cids[0]} className={cn("list-item", styles.className)}>
 <a data-cid={cids[1]} className="inline cursor-pointer" href={d.href} aria-label={d.label}>
 {d.label2}
 </a>
 </li>
 );
}
