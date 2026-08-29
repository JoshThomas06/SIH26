import type { MediaTileStyles } from "../_styles";
import { cn } from "../lib/utils";
export type MediaTileData = {
 ariahidden: string;
 description: string;
 srcSet: string;
 srcSet2: string;
 alt: string;
 height: string;
 imgSrc: string;
 srcSet3: string;
 width: string;
 text: string;
 text2: string;
};
/** A media tile. */
export default function MediaTile({ d, cids, styles }: { d: MediaTileData; cids: string[]; styles: MediaTileStyles }) {
 return (
 <article data-cid={cids[0]} className={cn("flex flex-col items-start col-start-1 row-start-1", styles.className)} aria-hidden={d.ariahidden as any}>
 <p data-cid={cids[1]} className={cn("block text-2xl md:text-4xl lg:text-5xl font-light tracking-tight leading-tight before:content-['“'] before:mr-2 before:text-color-002 before:text-4xl md:before:text-6xl after:content-['”'] after:ml-2 after:text-color-002 after:text-4xl md:after:text-6xl", styles.className2)}>
 {d.description}
 </p>
 <div data-cid={cids[2]} className={cn("w-full flex mt-12 md:mt-24 lg:mt-32 justify-between items-end gap-6", styles.className3)}>
 <div data-cid={cids[3]} className={cn("flex flex-col items-start gap-4 md:gap-8", styles.className4)}>

 <div data-cid={cids[8]} className={cn("flex flex-col text-left", styles.className9)}>
 <div data-cid={cids[9]} className={cn("block text-xs leading-4.5 tracking-[-0.24px]", styles.className10)}>
 {d.text}
 </div>
 <div data-cid={cids[10]} className={cn("block text-color-002 text-xs leading-4.5 tracking-[-0.24px] whitespace-nowrap", styles.className11)}>
 {d.text2}
 </div>
 </div>
 </div>

 </div>
 </article>
 );
}
