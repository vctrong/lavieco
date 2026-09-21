import type { ReactElement } from "react";

import type { Backdrop as BackdropName } from "../../../types";
import { KeyholeBackdrop } from "./keyhole-backdrop";
import { NetworkBackdrop } from "./network-backdrop";
import { PaletteBackdrop } from "./palette-backdrop";
import { ParticlesBackdrop } from "./particles-backdrop";
import { StairsBackdrop } from "./stairs-backdrop";
import { StoryBackdrop } from "./story-backdrop";

const BACKDROP_COMPONENTS = {
  network: NetworkBackdrop,
  particles: ParticlesBackdrop,
  palette: PaletteBackdrop,
  stairs: StairsBackdrop,
  story: StoryBackdrop,
  keyhole: KeyholeBackdrop,
} as const satisfies Record<BackdropName, () => ReactElement>;

type BackdropProps = { name: BackdropName };

/** Decorative art behind a member's cutout. Reacts to the parent `group` hover. */
export function Backdrop({ name }: BackdropProps) {
  const Component = BACKDROP_COMPONENTS[name];
  return <Component />;
}
