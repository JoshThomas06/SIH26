import type { FeatureCardStyles } from "../_styles";
import { cn } from "../../lib/utils";
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
      <div data-cid={cids[1]} className="flex invisible opacity-0 flex-col 2xl:[visibility:inherit] 2xl:opacity-[initial]">
        <div data-cid={cids[2]} className="block max-w-[45.3px] max-h-[2.225rem] max-md:max-w-[3.1875rem] max-md:max-h-10 md:max-lg:max-w-[6.525rem] md:max-lg:max-h-[5.125rem] 2xl:max-w-17 2xl:max-h-[53.3px]">
          <picture data-cid={cids[3]} className="inline">
            <source data-cid={cids[4]} className="inline max-lg:hidden" sizes="(max-width: 834px) 13.56vw, 3.54vw" srcSet={d.srcSet} type="image/avif" />
            <source data-cid={cids[5]} className="inline max-lg:hidden" sizes="(max-width: 834px) 13.56vw, 3.54vw" srcSet={d.srcSet2} type="image/webp" />
            <img data-cid={cids[6]} className={cn("block overflow-clip max-md:w-[3.1875rem] md:max-lg:w-26", styles.className)} alt={d.alt} height={d.height} sizes="(max-width: 834px) 13.56vw, 3.54vw" src={d.imgSrc} srcSet={d.srcSet3} width={d.width} />
          </picture>
        </div>
        <div data-cid={cids[7]} className="block mt-[1.775rem] text-[1.3125rem] leading-[1.5625rem] tracking-[-0.85px] max-md:max-w-65 max-md:mt-9 max-md:text-xl max-md:leading-6 max-md:tracking-[-0.8px] md:max-lg:max-w-[532.5px] md:max-lg:mt-[73.7px] md:max-lg:text-[2.5625rem] md:max-lg:leading-[3.0625rem] md:max-lg:tracking-[-1.64px] 2xl:mt-[42.7px] 2xl:text-[2rem] 2xl:leading-[2.3125rem] 2xl:tracking-[-1.28px]">
          {d.title}
        </div>
        <p data-cid={cids[8]} className="block mt-[21.3px] text-color-002 text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:mt-6 max-md:leading-[1.375rem] md:max-lg:mt-[3.075rem] md:max-lg:text-[2.3125rem] md:max-lg:leading-[2.8125rem] md:max-lg:tracking-[-0.74px] 2xl:mt-8 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px]">
          {d.description}
        </p>
      </div>
    </div>
  );
}
