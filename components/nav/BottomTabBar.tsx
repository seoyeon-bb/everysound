"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";

const TABS = [
  { key: "archive", href: "/archive" },
  { key: "launchpad", href: "/launchpad" },
  { key: "stage", href: "/stage" },
] as const;

const NO_SELECT_STYLE: React.CSSProperties = {
  WebkitUserSelect: "none",
  userSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 h-16 select-none border-t border-neutral-800 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/80"
      style={NO_SELECT_STYLE}
    >
      <ul className="mx-auto flex h-full max-w-screen-md items-stretch">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300"
                }`}
                style={NO_SELECT_STYLE}
                draggable={false}
              >
                <span style={NO_SELECT_STYLE}>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
