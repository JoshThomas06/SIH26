export type MediaLinkData = {
  href: string;
  label: string;
  label2: string;
};
/** A linked media tile. */
export default function MediaLink({ d, cids }: { d: MediaLinkData; cids: string[] }) {
  return (
    <a data-cid={cids[0]} className="border-b border-solid border-b-muted flex relative py-[21.3px] justify-evenly items-center gap-x-3.5 text-sm leading-[1.25rem] tracking-[-0.28px] cursor-pointer max-md:py-5 max-lg:flex-col max-md:gap-x-1.5 max-md:leading-[1.1875rem] max-lg:[align-items:initial] md:max-lg:py-[2.5625rem] md:max-lg:gap-x-[12.3px] md:max-lg:text-lg md:max-lg:leading-[1.5625rem] md:max-lg:tracking-[-0.36px] 2xl:py-8 2xl:gap-x-[21.3px] 2xl:text-lg 2xl:leading-[1.5625rem] 2xl:tracking-[-0.36px] hover:bg-clr-7 focus:bg-clr-15" data-component="link" href={d.href}>
      <div data-cid={cids[1]} className="block grow-[0.5] basis-[0%] max-lg:grow hover:transform-[none] focus:transform-[none]">
        {d.label}
      </div>
      <div data-cid={cids[2]} className="flex justify-between grow-[0.5] basis-[0%] gap-x-3.5 max-lg:flex-col max-lg:grow max-md:gap-x-1.5 max-lg:[justify-content:initial] md:max-lg:gap-x-[12.3px] 2xl:gap-x-[21.3px]">
        <div data-cid={cids[3]} className="block text-muted">
          {d.label2}
        </div>
        <div data-cid={cids[4]} className="flex items-center shrink-0 gap-x-1.5 max-md:mt-6 max-lg:[align-items:initial] md:max-lg:mt-[3.075rem] md:max-lg:gap-x-[12.3px] 2xl:gap-x-[9.3px]">
          {"Read more "}
          <div data-cid={cids[5]} className="w-[10.7px] h-[10.7px] flex invisible opacity-0 justify-center items-center overflow-hidden max-md:w-3.5 max-md:h-3.5 md:max-lg:w-[28.7px] md:max-lg:h-[28.7px] 2xl:w-4 2xl:h-4 2xl:[visibility:inherit] 2xl:opacity-[initial]">
            <svg data-cid={cids[6]} className="w-[0.6875rem] h-[0.6875rem] block max-md:w-3.5 max-md:h-3.5 md:max-lg:w-[1.8125rem] md:max-lg:h-[1.8125rem] 2xl:w-4 2xl:h-4" fill="none" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" data-v-843fca4e="">
              <circle cx="9.89859" cy="1.41437" r="1" transform="rotate(135 9.89859 1.41437)" fill="currentColor" />
              <circle cx="5.6564" cy="1.41437" r="1" transform="rotate(135 5.6564 1.41437)" fill="currentColor" />
              <circle cx="1.41422" cy="1.41437" r="1" transform="rotate(135 1.41422 1.41437)" fill="currentColor" />
              <circle cx="7.7775" cy="3.53546" r="1" transform="rotate(135 7.7775 3.53546)" fill="currentColor" />
              <circle cx="5.6564" cy="5.65655" r="1" transform="rotate(135 5.6564 5.65655)" fill="currentColor" />
              <circle cx="9.89859" cy="5.65655" r="1" transform="rotate(135 9.89859 5.65655)" fill="currentColor" />
              <circle cx="9.89859" cy="9.89874" r="1" transform="rotate(135 9.89859 9.89874)" fill="currentColor" />
              <circle cx="3.53531" cy="7.77765" r="1" transform="rotate(135 3.53531 7.77765)" fill="currentColor" />
              <circle cx="1.41422" cy="9.89874" r="1" transform="rotate(135 1.41422 9.89874)" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
