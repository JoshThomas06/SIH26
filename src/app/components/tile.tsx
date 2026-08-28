import type { TileStyles } from "../_styles";
import { cn } from "../../lib/utils";
export type TileData = {
  text: string;
};
/** A content tile. */
export default function Tile({ d, cids, styles }: { d: TileData; cids: string[]; styles: TileStyles }) {
  return (
    <div data-cid={cids[0]} className="hidden 2xl:block 2xl:relative" aria-hidden="true">
      <span data-cid={cids[1]} className={cn("hidden 2xl:block", styles.className)}>
        {d.text}
      </span>
    </div>
  );
}
