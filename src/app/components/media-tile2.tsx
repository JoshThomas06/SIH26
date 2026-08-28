import type { MediaTile2Styles } from "../_styles";
import { cn } from "../../lib/utils";
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
    <div data-cid={cids[0]} className="block invisible opacity-0 2xl:[visibility:inherit] 2xl:opacity-[initial]">
      <a data-cid={cids[1]} className="flex relative p-3.5 rounded-[14.2px] gap-x-[1.775rem] overflow-hidden bg-clr-2 [backdrop-filter:blur(60px)] cursor-pointer max-md:p-1.5 max-lg:rounded-2xl max-md:gap-x-3 md:max-lg:p-[12.3px] md:max-lg:gap-x-[1.5375rem] 2xl:p-[21.3px] 2xl:rounded-[21.3px] 2xl:gap-x-[42.7px]" href={d.href}>
        <div data-cid={cids[2]} className="w-[169.3px] block relative rounded-lg shrink-0 overflow-hidden aspect-square max-md:w-[4.6125rem] max-md:rounded-[9px] md:max-lg:w-[9.45rem] md:max-lg:rounded-[18.4px] 2xl:w-[15.875rem] 2xl:rounded-xl">
          <picture data-cid={cids[3]} className="inline max-lg:hidden">
            <source data-cid={cids[4]} className="inline max-lg:hidden" sizes="(max-width: 834px) 19.68vw, 30vw" srcSet={d.srcSet} type="image/avif" />
            <source data-cid={cids[5]} className="inline max-lg:hidden" sizes="(max-width: 834px) 19.68vw, 30vw" srcSet={d.srcSet2} type="image/webp" />
            <img data-cid={cids[6]} className={cn("w-[10.5625rem] h-[10.5625rem] block absolute overflow-clip object-cover aspect-[auto_4320/2430] max-md:w-18.5 max-md:h-18.5 md:max-lg:w-[9.4375rem] md:max-lg:h-[9.4375rem] 2xl:w-63.5 2xl:h-63.5", styles.className)} alt={d.alt} height="2430" sizes="(max-width: 834px) 19.68vw, 30vw" src={d.imgSrc} srcSet={d.srcSet3} width="4320" />
          </picture>
        </div>
        <div data-cid={cids[7]} className="w-[20.0375rem] flex min-w-45 pt-[1.1125rem] pb-1.5 flex-col justify-start text-lg leading-[1.3125rem] tracking-[-0.36px] max-md:w-[218.5px] max-lg:py-[0.1875rem] max-lg:justify-center max-md:text-sm max-md:leading-[1.1875rem] max-md:tracking-[-0.28px] max-lg:min-w-0 md:max-lg:w-[27.9625rem] md:max-lg:leading-[1.5625rem] 2xl:w-[480.9px] 2xl:pt-[26.7px] 2xl:pb-[8.7px] 2xl:text-[1.6875rem] 2xl:leading-8 2xl:tracking-[-0.53px]">
          <div data-cid={cids[8]} className="block">
            {d.label}
          </div>
          <div data-cid={cids[9]} className="block mt-3.5 text-muted-foreground max-lg:mt-0.5 2xl:mt-[21.3px]">
            {d.label2}
          </div>
        </div>
        <div data-cid={cids[10]} className="w-[24.9px] h-[24.9px] flex absolute right-3.5 bottom-3.5 opacity-0 min-w-0 rounded-[5.3px] justify-center items-center overflow-hidden text-color-001 bg-primary max-md:w-7 max-md:h-7 max-md:right-1.5 max-md:bottom-1.5 max-md:rounded-md md:max-lg:w-[57.3px] md:max-lg:h-[57.3px] md:max-lg:right-[12.3px] md:max-lg:bottom-[12.3px] md:max-lg:rounded-xl 2xl:w-[37.3px] 2xl:h-[37.3px] 2xl:right-[21.3px] 2xl:bottom-[21.3px] 2xl:rounded-lg 2xl:opacity-[initial]">
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
      </a>
    </div>
  );
}
