import { Link } from "react-router-dom";
import type { MediaTile2Styles } from "../_styles";
import { cn, withBase } from "../lib/utils";
export type MediaTile2Data = {
 href: string;
 srcSet: string;
 srcSet2: string;
 alt: string;
 imgSrc: string;
 srcSet3: string;
 label: string;
 label2: string;
};
/** A media tile. */
export default function MediaTile2({ d, cids, styles }: { d: MediaTile2Data; cids: string[]; styles: MediaTile2Styles }) {
 return (
 <div data-cid={cids[0]} className="block ">
  <Link data-cid={cids[1]} className="flex items-center relative p-3 md:p-4 rounded-2xl gap-x-4 md:gap-x-8 overflow-hidden bg-clr-2 [backdrop-filter:blur(60px)] cursor-pointer hover:bg-white/5 transition-colors" to={d.href}>
 <div data-cid={cids[2]} className="w-16 h-16 md:w-32 md:h-32 lg:w-48 lg:h-48 block relative rounded-lg shrink-0 overflow-hidden aspect-square">
 <picture data-cid={cids[3]} className="inline max-lg:hidden">
  <source data-cid={cids[4]} className="inline max-lg:hidden" sizes="(max-width: 834px) 19.68vw, 30vw" srcSet={withBase(d.srcSet)} type="image/avif" />
  <source data-cid={cids[5]} className="inline max-lg:hidden" sizes="(max-width: 834px) 19.68vw, 30vw" srcSet={withBase(d.srcSet2)} type="image/webp" />
  <img data-cid={cids[6]} className={cn("w-full h-full block absolute overflow-clip object-cover", styles.className)} alt={d.alt} height="2430" sizes="(max-width: 834px) 19.68vw, 30vw" src={withBase(d.imgSrc)} srcSet={withBase(d.srcSet3)} width="4320" />
 </picture>
 </div>
 <div data-cid={cids[7]} className="flex flex-1 flex-col justify-center text-base md:text-xl lg:text-2xl tracking-tight leading-snug pr-12">
 <div data-cid={cids[8]} className="block">
 {d.label}
 </div>
 <div data-cid={cids[9]} className="block mt-1 text-sm md:text-lg text-muted-foreground">
 {d.label2}
 </div>
 </div>
 <div data-cid={cids[10]} className="w-8 h-8 md:w-12 md:h-12 flex absolute right-4 bottom-4 md:right-6 md:bottom-6 rounded-md md:rounded-xl justify-center items-center overflow-hidden text-color-001 bg-primary">
 <svg data-cid={cids[11]} className="w-4 h-4 block max-md:w-4.5 max-md:h-4.5 md:max-lg:w-[2.3125rem] md:max-lg:h-[2.3125rem] 2xl:w-6 2xl:h-6" fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" data-v-843fca4e="">
 <circle cx="9.95587" cy="9.96109" r="1" transform="rotate(45 9.95587 9.96109)" fill="currentColor" />
 <circle cx="14.0262" cy="14.2111" r="1" transform="rotate(45 14.0262 14.2111)" fill="currentColor" />
 <circle cx="9.95587" cy="18.4494" r="1" transform="rotate(45 9.95587 18.4494)" fill="currentColor" />
 <circle cx="14.0252" cy="9.96109" r="1" transform="rotate(45 14.0252 9.96109)" fill="currentColor" />
 <circle cx="18.4412" cy="9.96109" r="1" transform="rotate(45 18.4412 9.96109)" fill="currentColor" />
 <circle cx="9.90509" cy="9.90219" r="1" transform="rotate(-135 9.90509 9.90219)" fill="currentColor" />
 <circle cx="14.0262" cy="5.67172" r="1" transform="rotate(-135 14.0262 5.67172)" fill="currentColor" />
 <circle cx="9.90509" cy="1.41391" r="1" transform="rotate(-135 9.90509 1.41391)" fill="currentColor" />
 <circle cx="5.66192" cy="9.90219" r="1" transform="rotate(-135 5.66192 9.90219)" fill="currentColor" />
 <circle cx="1.41974" cy="9.90219" r="1" transform="rotate(-135 1.41974 9.90219)" fill="currentColor" />
 </svg>
 </div>
  </Link>
  </div>
  );
}
