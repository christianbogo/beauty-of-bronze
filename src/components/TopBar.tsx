import { Heart, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useI18n } from "../providers/I18nProvider";
import { useOverlay } from "../providers/OverlayProvider";
import { useEffect, useState } from "react";

export function TopBar({ mode = "default" }: { mode?: "default" | "home" }) {
  const { t } = useI18n();
  const { open } = useOverlay();
  const [show, setShow] = useState(mode === "default");

  useEffect(() => {
    if (mode !== "home") return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      setShow(y > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode]);

  // When switching from home -> any other route, ensure the bar is visible
  useEffect(() => {
    if (mode === "default") setShow(true);
  }, [mode]);

  return (
    <header
      className={
        (show
          ? "sticky top-0 z-40 translate-y-0 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70"
          : "sticky top-0 z-40 -translate-y-full border-transparent bg-transparent h-0 overflow-hidden") +
        " transition-all duration-300"
      }
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-4">
        {/* Left: Hamburger */}
        <button
          aria-label={t("openMenu")}
          onClick={open}
          className="inline-flex h-9 items-center justify-center rounded-md px-2 hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
        >
          <Menu className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">Menu</span>
        </button>

        {mode === "default" || (mode === "home" && show) ? (
          <Link to="/" aria-label="Beauty of Bronze">
            <Logo />
          </Link>
        ) : (
          <div />
        )}

        {/* Right: Heart donate link */}
        <a
          href="https://givebutter.com/beautyofbronze"
          target="_blank"
          rel="noreferrer"
          aria-label={t("donate")}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-brand-600 hover:bg-brand-50 active:bg-brand-100 dark:text-brand-400 dark:hover:bg-neutral-900"
        >
          <Heart className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">{t("donate")}</span>
        </a>
      </div>
    </header>
  );
}
