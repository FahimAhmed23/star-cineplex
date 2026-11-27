"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLang, useT } from "@/lib/i18n";
import { usePanels } from "@/lib/panels";
import { toggleSound, useSound } from "@/lib/sound";
import { useMyTickets } from "./MyTickets";
import { useUi } from "@/lib/store";

/** Home sections the navbar scrolls to (§7 navigation map). Built in Phases 3–4. */
const SECTION_LINKS = [
  { key: "nav.nowShowing", id: "now-showing" },
  { key: "nav.comingSoon", id: "coming-soon" },
] as const;
const PHONE = "09617660660";

interface Props {
  /** home: stay hidden during the opening and slide in after the split reveal (§7 Behaviour) */
  revealWithIntro?: boolean;
}

/**
 * "Notch tab" navbar (CLAUDE.md §7): a full-width utility strip with a compact tab hanging from it.
 * Keeps every item of the current starcineplex.com navbar; About moves to the footer.
 */
export function Navbar({ revealWithIntro = false }: Props) {
  const { t } = useT();
  const stage = useUi((s) => s.stage);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // the glow outline follows the tab, whose width hugs its content: measure it
  const tabRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<{ w: number; l: number; r: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = document.documentElement.clientWidth;
      setTab((t) => (t && t.w === w && t.l === r.left && t.r === r.right && t.h === r.height ? t : { w, l: r.left, r: r.right, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const [active, setActive] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const hidden = revealWithIntro && stage === "intro";
  const showPanel = usePanels((s) => s.show);
  const openTickets = useMyTickets();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // active link = the home section crossing the middle of the viewport (looked up live, so re-mounted
  // sections and sections added in later phases just work)
  useEffect(() => {
    if (pathname !== "/") return setActive(null);
    const ids = [...SECTION_LINKS.map((l) => l.id), "branches"];
    let raf = 0;
    const check = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      const hit = ids.find((id) => {
        const r = document.getElementById(id)?.getBoundingClientRect();
        return r && r.top <= mid && r.bottom >= mid;
      });
      setActive(hit ?? null);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Escape closes the menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  /** Smooth-scroll on the home page; from other pages go home first, then scroll (§7). */
  const goToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else router.push(`/#${id}`);
  };

  const links = (
    <>
      {SECTION_LINKS.map((l) => (
        <a key={l.id} href={`/#${l.id}`} onClick={goToSection(l.id)} className="nav-link focus-ring" aria-current={active === l.id || undefined}>
          {t(l.key)}
        </a>
      ))}
      <Link href="/book" className="nav-link focus-ring" aria-current={pathname.startsWith("/book") || undefined}>
        {t("nav.showtimes")}
      </Link>
      <button type="button" className="nav-link focus-ring" aria-haspopup="dialog" onClick={() => { setMenuOpen(false); showPanel("prices"); }}>
        {t("nav.prices")}
      </button>
      <a href="/#branches" onClick={goToSection("branches")} className="nav-link focus-ring" aria-current={active === "branches" || undefined}>
        {t("nav.branches")}
      </a>
    </>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-[600ms] ease-out ${scrolled ? "nav-scrolled" : ""} ${hidden ? "-translate-y-[110%]" : "translate-y-0"}`}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
    >
      {/* the glow (designer, Nov 26): a band of light under the whole navbar, left to right, brightest in the middle */}
      <span aria-hidden className="nav-glow-band" />
      {tab && <GlowOutline {...tab} />}
      {/* top strip — on every screen; below 1100px just the number and the language (designer, Nov 27) */}
      <div className="nav-strip nav-bg relative z-[1] flex h-8 items-center justify-between px-6 text-[12px] lg:h-10 text-muted max-md:px-5 min-[1100px]:text-[14px]">
        <a href={`tel:${PHONE}`} className="focus-ring flex items-center gap-2 hover:text-white" aria-label={`${t("nav.call")} ${PHONE}`}>
          <span className="hidden min-[1100px]:inline">{t("nav.customerService")}</span>
          <Icon name="phone" size={18} />
          <span className="tabular-nums">{PHONE}</span>
        </a>
        <div className="flex items-center gap-5 min-[1100px]:gap-6">
          <button type="button" onClick={openTickets} className="focus-ring hidden items-center gap-2 hover:text-white min-[1100px]:flex">
            <Icon name="ticket" size={18} />
            {t("nav.myTickets")}
          </button>
          <LangToggle iconSize={18} />
        </div>
      </div>

      {/* the notch tab */}
      <nav
        ref={tabRef}
        aria-label={t("nav.mainNav")}
        className={`nav-tab nav-bg relative z-[1] mx-auto flex h-[52px] w-fit items-center gap-7 rounded-b-[14px] px-5 transition-shadow duration-300 lg:h-[68px] ${scrolled ? "shadow-[0_12px_30px_-12px_rgba(0,0,0,.7)]" : ""}`}
      >
        <Link href="/" className="focus-ring shrink-0 min-[1100px]:mr-8" /* 60px to the links (designer) */ aria-label={t("nav.home")} onClick={(e) => { if (pathname === "/") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}>
          <Image src="/brand/logo-white.png" alt="Star Cineplex" width={1200} height={499} className="h-8 w-auto lg:h-10" priority />
        </Link>
        <div className="hidden items-center gap-7 min-[1100px]:flex">{links}</div>
        {/* below 1024px Buy Tickets lives in the menu (designer, Nov 27) */}
        <span className="shrink-0 max-lg:hidden min-[1100px]:ml-8" /* 60px from the links */>
          <ButtonLink href="/book" variant="white" size="xs" icon="ticket">
            {t("common.buyTickets")}
          </ButtonLink>
        </span>
        <button
          type="button"
          className="focus-ring -mr-1 grid size-9 place-items-center rounded-pill text-muted hover:text-white min-[1100px]:hidden"
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? "closeSimple" : "menu"} size={20} />
        </button>
        {/* lit from below like a cinema canopy (designer, Nov 26): a light edge + a soft purple spill */}
        <span aria-hidden className="nav-glow" />
      </nav>

      {/* collapsed menu (< 1100px): all links, My tickets, language, phone */}
      {menuOpen && (
        <div id="nav-menu" className="mx-5 mt-3 rounded-card-md border border-white/10 bg-night p-6 text-center min-[1100px]:hidden">
          <div className="flex flex-col items-center gap-4">{links}</div>
          <ButtonLink href="/book" variant="white" icon="ticket" className="mt-6 w-full justify-center" onClick={() => setMenuOpen(false)}>
            {t("common.buyTickets")}
          </ButtonLink>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-[13px] text-muted">
            <button type="button" onClick={() => { setMenuOpen(false); openTickets(); }} className="focus-ring flex items-center gap-1.5 hover:text-white">
              <Icon name="ticket" size={16} />
              {t("nav.myTickets")}
            </button>
            <SoundToggle />
          </div>
          {/* the number and EN / বাংলা are in the strip above the tab below 1100px, so the menu doesn't repeat them */}
        </div>
      )}
    </header>
  );
}

/**
 * The navbar's light (designer, Nov 26): one continuous line tracing the bar's silhouette — along the top strip,
 * round the curved corners, down the tab's sides and along its bottom — brightest in the middle, fading towards the
 * left and right edges, with a soft blurred copy for the glow. Desktop only (phones have no strip).
 */
function GlowOutline({ w, l, r, h }: { w: number; l: number; r: number; h: number }) {
  const R = 14; // flare and corner radius
  const S = w < 1024 ? 32 : 40; // top strip height (compact below 1024px, designer Nov 27)
  const B = S + h; // tab bottom
  const d = [
    `M0 ${S}`,
    `H${l - R}`,
    `A${R} ${R} 0 0 1 ${l} ${S + R}`, // concave flare into the tab
    `V${B - R}`,
    `A${R} ${R} 0 0 0 ${l + R} ${B}`, // tab's rounded bottom corner
    `H${r - R}`,
    `A${R} ${R} 0 0 0 ${r} ${B - R}`,
    `V${S + R}`,
    `A${R} ${R} 0 0 1 ${r + R} ${S}`,
    `H${w}`,
  ].join(" ");
  return (
    <svg aria-hidden className="nav-glow-outline" width={w} height={B + 12} viewBox={`0 0 ${w} ${B + 12}`}>
      <defs>
        <linearGradient id="nav-glow-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
          <stop offset="0" stopColor="#B784D6" stopOpacity="0.12" />
          <stop offset="0.3" stopColor="#B784D6" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#E0C4F2" stopOpacity="1" />
          <stop offset="0.7" stopColor="#B784D6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#B784D6" stopOpacity="0.12" />
        </linearGradient>
        <filter id="nav-glow-blur" x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="url(#nav-glow-grad)" strokeWidth="4" filter="url(#nav-glow-blur)" opacity="0.7" />
      <path d={d} fill="none" stroke="url(#nav-glow-grad)" strokeWidth="1.25" />
    </svg>
  );
}

/** §10 global sound toggle: off by default, remembered. */
export function SoundToggle({ iconSize = 16 }: { iconSize?: number }) {
  const { t } = useT();
  const on = useSound((s) => s.on);
  return (
    <button type="button" onClick={toggleSound} aria-pressed={on} className={`focus-ring flex items-center gap-2 ${on ? "text-white" : "hover:text-white"}`}>
      <Icon name={on ? "volumeOn" : "volumeOff"} size={iconSize} />
      {t(on ? "nav.soundOn" : "nav.soundOff")}
    </button>
  );
}

/** EN / বাংলা — active language white + underlined, the other muted (§7). */
export function LangToggle({ iconSize = 16 }: { iconSize?: number }) {
  const { t, lang } = useT();
  const setLang = useLang((s) => s.setLang);
  return (
    <div className="flex items-center gap-2" role="group" aria-label={t("common.language")}>
      <Icon name="globe" size={iconSize} />
      <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"} className={`focus-ring ${lang === "en" ? "text-white underline underline-offset-4" : "hover:text-white"}`}>
        EN
      </button>
      <span aria-hidden>/</span>
      <button type="button" lang="bn" onClick={() => setLang("bn")} aria-pressed={lang === "bn"} className={`focus-ring font-bangla ${lang === "bn" ? "text-white underline underline-offset-4" : "hover:text-white"}`}>
        বাংলা
      </button>
    </div>
  );
}
