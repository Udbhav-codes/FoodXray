"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { useStore } from "@/lib/store";

/* Bottom navigation — four tabs, spec §6. The Scan tab is a pure shortcut
   that opens the camera with no landing page in between. */

const TABS: { href: string; icon: IconName; key: string }[] = [
  { href: "/", icon: "home", key: "navHome" },
  { href: "/scan", icon: "scan", key: "navScan" },
  { href: "/plan", icon: "plan", key: "navPlan" },
  { href: "/profile", icon: "profile", key: "navProfile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t, ready } = useStore();

  // The camera screen is full-bleed; the nav would sit on top of the shutter.
  if (pathname?.startsWith("/scan/camera")) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/92 backdrop-blur-lg"
    >
      <ul className="shell safe-bottom flex items-stretch justify-around gap-1 py-1.5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname?.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                // 48dp minimum touch target — non-negotiable (spec §14.4).
                className={`press flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ${
                  active
                    ? "bg-leaf-50 text-leaf-700"
                    : "text-ink-600 hover:bg-surface-2 hover:text-ink-900"
                }`}
              >
                <Icon name={tab.icon} size={26} strokeWidth={active ? 2.3 : 2} />
                {/* Icons are never alone: Hindi-first users may not read
                    Western icon conventions (spec §14.8). */}
                <span
                  className={`text-[11px] leading-none u-tight ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {ready ? t(tab.key) : " "}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
