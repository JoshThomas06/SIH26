import type { FeatureCardStyles } from "../_styles";
import { cn } from "../lib/utils";
export type FeatureCardData = {
 srcSet: string;
 srcSet2: string;
 alt: string;
 height: string;
 imgSrc: string;
 srcSet3: string;
 width: string;
 description: string;
 title: string;
};
/** A feature card. */
export default function FeatureCard({ d, cids, styles }: { d: FeatureCardData; cids: string[]; styles: FeatureCardStyles }) {
 return (
 <div data-cid={cids[0]} className="block">
 <div data-cid={cids[1]} className="flex flex-col ">
 <div data-cid={cids[2]} className="block w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20">
 <picture data-cid={cids[3]} className="inline">
 <source data-cid={cids[4]} className="inline max-lg:hidden" sizes="(max-width: 834px) 13.56vw, 3.54vw" srcSet={d.srcSet} type="image/avif" />
 <source data-cid={cids[5]} className="inline max-lg:hidden" sizes="(max-width: 834px) 13.56vw, 3.54vw" srcSet={d.srcSet2} type="image/webp" />
 <img data-cid={cids[6]} className={cn("block overflow-clip w-full h-full object-contain", styles.className)} alt={d.alt} height={d.height} sizes="(max-width: 834px) 13.56vw, 3.54vw" src={d.imgSrc} srcSet={d.srcSet3} width={d.width} />
 </picture>
 </div>
 <div data-cid={cids[7]} className="block mt-8 text-xl md:text-3xl lg:text-4xl tracking-tight leading-tight">
 {d.title}
 </div>
 <p data-cid={cids[8]} className="block mt-6 text-color-002 text-base md:text-xl lg:text-2xl tracking-tight leading-snug">
 {d.description}
 </p>
 </div>
 </div>
 );
}
