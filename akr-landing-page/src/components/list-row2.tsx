import type { ListRow2Styles } from "../_styles";
import { cn } from "../lib/utils";
export type ListRow2Data = {
 href: string;
 label: string;
 label2: string;
};
/** A list row. */
export default function ListRow2({ d, cids, styles }: { d: ListRow2Data; cids: string[]; styles: ListRow2Styles }) {
 return (
 <li data-cid={cids[0]} className={cn("list-item", styles.className)}>
 <a data-cid={cids[1]} className="inline cursor-pointer" data-component="link" href={d.href} aria-label={d.label}>
 {d.label2}
 </a>
 </li>
 );
}
