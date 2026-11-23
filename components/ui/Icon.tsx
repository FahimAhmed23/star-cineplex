"use client";

import { Icon as Iconify, addCollection } from "@iconify/react";
import { ICONS, solarSubset } from "./icons.generated";

// Offline Solar subset (no runtime API calls). Names verified by scripts/build-icons.mjs.
// Icons: Solar by 480 Design (CC BY 4.0).
addCollection(solarSubset);

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  /** 16 inline · 20 buttons/navbar · 24 controls · 32–40 feature cards (§5 Icons) */
  size?: 14 | 16 | 18 | 20 | 24 | 32 | 40;
  className?: string;
  /** Decorative by default; pass a label when the icon carries meaning on its own. */
  label?: string;
}

export function Icon({ name, size = 20, className, label }: Props) {
  const isDuo = ICONS[name].endsWith("-bold-duotone");
  return (
    <Iconify
      icon={`solar:${ICONS[name]}`}
      width={size}
      height={size}
      className={[isDuo ? "icon-duo" : "", "shrink-0", className].filter(Boolean).join(" ")}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
