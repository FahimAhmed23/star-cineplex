"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLang, useT } from "@/lib/i18n";
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
  const [active, setActive] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const hidden = revealWithIntro && stage === "intro";

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
      {/* Prices slide-over panel: Phase 8 */}
      <button type="button" className="nav-link focus-ring">{t("nav.prices")}</button>
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
      {/* top strip — hidden on phones */}
      <div className="nav-bg hidden h-9 items-center justify-between px-6 text-[13px] text-muted md:flex">
        <a href={`tel:${PHONE}`} className="focus-ring flex items-center gap-1.5 hover:text-white" aria-label={`${t("nav.call")} ${PHONE}`}>
          <Icon name="phone" size={14} />
          <span className="tabular-nums">{PHONE}</span>
        </a>
        <div className="hidden items-center gap-5 min-[1100px]:flex">
          {/* My tickets: Phase 8 */}
          <button type="button" className="focus-ring flex items-center gap-1.5 hover:text-white">
            <Icon name="ticket" size={14} />
            {t("nav.myTickets")}
          </button>
          <LangToggle />
        </div>
      </div>

      {/* the notch tab */}
      <nav
        aria-label={t("nav.mainNav")}
        className={`nav-tab nav-bg relative mx-auto flex h-[60px] w-fit items-center gap-7 rounded-b-[14px] px-5 transition-shadow duration-300 ${scrolled ? "shadow-[0_12px_30px_-12px_rgba(0,0,0,.7)]" : ""}`}
      >
        <Link href="/" className="focus-ring shrink-0" aria-label={t("nav.home")} onClick={(e) => { if (pathname === "/") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}>
          <Image src="/brand/logo-white.png" alt="Star Cineplex" width={1200} height={499} className="h-7 w-auto" priority />
        </Link>
        <div className="hidden items-center gap-7 min-[1100px]:flex">{links}</div>
        <ButtonLink href="/book" variant="white" size="xs" icon="ticket" className="shrink-0">
          {t("common.buyTickets")}
        </ButtonLink>
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
      </nav>

      {/* collapsed menu (< 1100px): all links, My tickets, language, phone */}
      {menuOpen && (
        <div id="nav-menu" className="glass mx-auto mt-3 w-[min(92vw,420px)] rounded-card-md border border-white/10 p-6 min-[1100px]:hidden">
          <div className="flex flex-col items-start gap-4 [&_.nav-link]:text-[16px]">{links}</div>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-[13px] text-muted">
            <button type="button" className="focus-ring flex items-center gap-1.5 hover:text-white">
              <Icon name="ticket" size={16} />
              {t("nav.myTickets")}
            </button>
            <LangToggle />
          </div>
          <a href={`tel:${PHONE}`} className="focus-ring mt-4 flex items-center gap-1.5 text-[13px] text-muted hover:text-white">
            <Icon name="phone" size={16} />
            {PHONE}
          </a>
        </div>
      )}
    </header>
  );
}

/** EN / বাংলা — active language white + underlined, the other muted (§7). */
export function LangToggle() {
  const { t, lang } = useT();
  const setLang = useLang((s) => s.setLang);
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t("common.language")}>
      <Icon name="globe" size={14} />
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
