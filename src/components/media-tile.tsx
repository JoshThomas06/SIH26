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
 <p data-cid={cids[1]} className={cn("block text-[1.3125rem] leading-[1.5625rem] tracking-[-0.85px] max-md:text-xl max-md:leading-6 max-md:tracking-[-0.8px] md:max-lg:text-[2.5625rem] md:max-lg:leading-[3.0625rem] md:max-lg:tracking-[-1.64px] 2xl:text-[2rem] 2xl:leading-[2.3125rem] 2xl:tracking-[-1.28px] before:content-['“'] before:mr-[13.7px] before:text-color-002 before:text-[2rem] before:font-light before:leading-0 before:tracking-[-0.85px] max-md:before:mr-1 max-md:before:text-[1.875rem] max-md:before:tracking-[-0.8px] md:max-lg:before:mr-2 md:max-lg:before:text-[3.8125rem] md:max-lg:before:tracking-[-1.64px] 2xl:before:mr-[20.5px] 2xl:before:text-[3rem] 2xl:before:tracking-[-1.28px] after:content-['”'] after:ml-[13.7px] after:text-color-002 after:text-[2rem] after:font-light after:leading-0 after:tracking-[-0.85px] max-md:after:ml-1 max-md:after:text-[1.875rem] max-md:after:tracking-[-0.8px] md:max-lg:after:ml-2 md:max-lg:after:text-[3.8125rem] md:max-lg:after:tracking-[-1.64px] 2xl:after:ml-[20.5px] 2xl:after:text-[3rem] 2xl:after:tracking-[-1.28px]", styles.className2)}>
 {d.description}
 </p>
 <div data-cid={cids[2]} className={cn("w-full flex mt-[71.1px] justify-between items-end gap-[1.1125rem] max-md:mt-15 max-md:gap-5 md:max-lg:mt-[122.9px] md:max-lg:gap-[2.5625rem] 2xl:mt-[106.7px] 2xl:gap-[26.7px]", styles.className3)}>
 <div data-cid={cids[3]} className={cn("flex flex-col items-start gap-[1.1125rem] max-md:gap-5 md:max-lg:gap-[2.5625rem] 2xl:gap-[26.7px]", styles.className4)}>

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
