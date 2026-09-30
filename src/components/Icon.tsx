import type { SVGProps } from "react";

/* ═══════════════════════════════════════════════════════════════════
   ICONOGRAPHY — spec §14.8: rounded, 2px stroke, organic terminals.
   SVG only. Emoji are font-dependent and cannot be themed, so they are
   never used as structural icons.

   Decorative icons sit beside a visible text label and are hidden from
   assistive tech; standalone icons must be given a `title`.
   ═══════════════════════════════════════════════════════════════════ */

export type IconName =
  | "home" | "scan" | "plan" | "profile" | "leaf" | "camera" | "image"
  | "keyboard" | "chevronDown" | "chevronRight" | "arrowLeft" | "globe"
  | "bulb" | "swap" | "pin" | "check" | "close" | "alert" | "info"
  | "plus" | "minus" | "trash" | "share" | "flag" | "download" | "search"
  | "sliders" | "sun" | "moon" | "monitor" | "lock" | "chart" | "users"
  | "sparkle" | "cookie" | "noodles" | "cup" | "snack" | "bowl"
  | "chocolate" | "bread" | "jar" | "flame" | "target" | "history";

const PATHS: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.5" /></>,
  scan: <><path d="M3 8V6a3 3 0 0 1 3-3h2" /><path d="M16 3h2a3 3 0 0 1 3 3v2" /><path d="M21 16v2a3 3 0 0 1-3 3h-2" /><path d="M8 21H6a3 3 0 0 1-3-3v-2" /><path d="M7 12h10" /></>,
  plan: <><path d="M4 13a8 8 0 0 1 16 0Z" /><path d="M2.5 17h19" /><path d="M12 5V3" /><path d="M8.5 9.5c1-1.5 2.2-2.2 3.5-2.2s2.5.7 3.5 2.2" /></>,
  profile: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  leaf: <><path d="M4 20c0-8 5-14 16-15 0 11-5.5 16-11 16-2 0-5-1-5-1Z" /><path d="M9.5 15.5c2-3.5 4.5-5.8 7.5-7.5" /></>,
  camera: <><path d="M3 8.5A2 2 0 0 1 5 6.5h1.8l1.3-2h7.8l1.3 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.6" /></>,
  image: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10" r="1.6" /><path d="m4.5 17 4.6-4.4a1.6 1.6 0 0 1 2.2 0L16 17" /><path d="m14.5 15 1.6-1.5a1.6 1.6 0 0 1 2.2 0l1.2 1.1" /></>,
  keyboard: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10" /></>,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3.2 9.5h17.6M3.2 14.5h17.6" /><path d="M12 3c-2.4 2.4-3.6 5.4-3.6 9s1.2 6.6 3.6 9c2.4-2.4 3.6-5.4 3.6-9S14.4 5.4 12 3Z" /></>,
  bulb: <><path d="M9 17.5h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 1 3.6 10.8c-.5.4-.8 1-.8 1.7H9.2c0-.7-.3-1.3-.8-1.7A6 6 0 0 1 12 3Z" /></>,
  swap: <><path d="M4 8h13" /><path d="m14 5 3 3-3 3" /><path d="M20 16H7" /><path d="m10 13-3 3 3 3" /></>,
  pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.8" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <><path d="m5.5 5.5 13 13" /><path d="m18.5 5.5-13 13" /></>,
  alert: <><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4" /><path d="M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><path d="M12 7.8h.01" /></>,
  plus: <><path d="M12 5.5v13" /><path d="M5.5 12h13" /></>,
  minus: <path d="M5.5 12h13" />,
  trash: <><path d="M4 7h16" /><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" /><path d="M6.5 7v12.2A1.8 1.8 0 0 0 8.3 21h7.4a1.8 1.8 0 0 0 1.8-1.8V7" /><path d="M10.5 11v6M13.5 11v6" /></>,
  share: <><path d="M12 15.5V4" /><path d="m8 7.5 4-3.5 4 3.5" /><path d="M5.5 13v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" /></>,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 5h11l-2 3.5 2 3.5h-11" /></>,
  download: <><path d="M12 4v11" /><path d="m8 11.5 4 3.5 4-3.5" /><path d="M5 19.5h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16.2 16.2 4.3 4.3" /></>,
  sliders: <><path d="M4 8h10M18 8h2" /><path d="M4 16h4M12 16h8" /><circle cx="16" cy="8" r="2.2" /><circle cx="10" cy="16" r="2.2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>,
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />,
  monitor: <><rect x="2.5" y="4" width="19" height="13" rx="2.5" /><path d="M8.5 21h7M12 17v4" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 20v-6M12 20V6M17 20v-9" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.4 3.4 0 0 1 0 5.6" /><path d="M17.5 14.4A6.5 6.5 0 0 1 21.5 20" /></>,
  sparkle: <><path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9Z" /><path d="M18.5 16.5 19 18.4l1.9.6-1.9.6-.5 1.9-.6-1.9-1.9-.6 1.9-.6Z" /></>,
  cookie: <><circle cx="12" cy="12" r="8.6" /><path d="M9 9h.01M14.5 8.5h.01M15.5 14h.01M9.5 15h.01M12 12h.01" /></>,
  noodles: <><path d="M4 10h16" /><path d="M5.5 10a6.5 6.5 0 0 0 13 0" /><path d="M8 10V5.5M12 10V4.5M16 10V5.5" /><path d="M4 20h16" /></>,
  cup: <><path d="M5 6h12v9a5 5 0 0 1-10 0Z" /><path d="M17 8h1.8a2.7 2.7 0 0 1 0 5.4H17" /><path d="M4 21h14" /></>,
  snack: <><path d="M6.5 3.5h11l2 4-7.5 13-7.5-13Z" /><path d="M4.5 7.5h15" /><path d="M10 7.5 12 20.5 14 7.5" /></>,
  bowl: <><path d="M3 11h18" /><path d="M4.5 11a7.5 7.5 0 0 0 15 0" /><path d="M8.5 7.5c0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3" /></>,
  chocolate: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M4.5 9h15M4.5 15h15M12 3.5v17" /></>,
  bread: <><path d="M4 11c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17Z" /><path d="M9 8.5c0 2-1.5 3-1.5 5M14 8.5c0 2-1.5 3-1.5 5" /></>,
  jar: <><path d="M8 3.5h8v2.8l1.5 1.7V19a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V8l1.5-1.7Z" /><path d="M6.5 11h11" /></>,
  flame: <><path d="M12 21c3.6 0 6-2.4 6-5.6 0-4-3.4-5.9-3.4-9.4-2 .8-3 2.4-3 4.2-1.2-.7-1.8-2-1.8-3.4C7.6 8.2 6 11 6 15.4 6 18.6 8.4 21 12 21Z" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5V10H9" /><path d="M12 8v4.4l3 1.8" /></>,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Give a title only for standalone icons with no adjacent text label. */
  title?: string;
}

export function Icon({ name, size = 24, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
