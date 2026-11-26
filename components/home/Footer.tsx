"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LangToggle } from "@/components/nav/Navbar";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { AboutPanel } from "./AboutPanel";
import { useMyTickets } from "@/components/nav/MyTickets";
import { usePanels } from "@/lib/panels";
import { RevealText, revealDuration } from "@/components/ui/RevealText";

const PHONE = "09617660660";
/** Brand marks from Simple Icons (CC0). Links are placeholders until the official pages are confirmed (§8.10). */
const SOCIAL_PATHS = {"facebook":"M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z","instagram":"M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077","youtube":"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"} as const;
const SOCIAL = [
  { key: "facebook", label: "Facebook", href: "#" },
  { key: "instagram", label: "Instagram", href: "#" },
  { key: "youtube", label: "YouTube", href: "#" },
] as const;

/**
 * Footer — "The best seat in the house" (CLAUDE.md §8.10): the hall seen from the seats, the Star Cineplex logo
 * on the screen like a projector starting, one seat glowing gold for you, then the links on solid night.
 */
export function Footer() {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const hall = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [about, setAbout] = useState(false);
  const showPanel = usePanels((s) => s.show);
  const openTickets = useMyTickets();

  // plays once per page view when the footer comes into view; light parallax on the hall image
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => io.disconnect();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const top = el.getBoundingClientRect().top;
        if (hall.current && top < innerHeight) hall.current.style.transform = `translate3d(0, ${(-top * 0.15).toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /** home sections scroll smoothly; from other pages go home first (§7) */
  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    else router.push(`/#${id}`);
  };

  return (
    <footer ref={root} className={`footer relative overflow-hidden bg-night ${on ? "is-on" : ""}`}>
      {/* the hall: image + logo layer + your seat, with gradients so it melts into the page */}
      <div className="relative" aria-hidden>
        <div ref={hall} className="footer-hall relative w-full will-change-transform" style={{ aspectRatio: "1660 / 925" }}>
          <Image src="/brand/footer-hall.webp" alt="" fill sizes="100vw" className="footer-photo object-cover" />
          {/* the screen sits at x 28–72%, y 28–61% of the image */}
          <div className="footer-logo absolute grid place-items-center" style={{ left: "28%", top: "28.2%", width: "44%", height: "33%" }}>
            <Image src="/brand/logo.png" alt="" width={1200} height={499} className="h-auto w-[56%]" />
          </div>
          <div className="footer-fade-top absolute inset-0" />
          <div className="footer-vignette absolute inset-0" />
          <div className="footer-fade-bottom absolute inset-0" />
          {/* "your seat": above the fades so the gold reads */}
          <div className="footer-seat absolute" style={{ left: "53.5%", top: "72.5%" }} />
        </div>
      </div>

      {/* a fade pinned to the footer's top edge (it doesn't move with the parallax): the hall image is shifted up while
          the footer scrolls in, and its own top fade gets clipped, so this keeps the black-to-hall join soft */}
      <div className="footer-edge pointer-events-none absolute inset-x-0 top-0 z-[1]" aria-hidden />

      {/* headline over the seats */}
      <div className="relative z-10 mx-auto -mt-[15vw] max-w-[1200px] px-8 text-center">
        <h2 className="footer-title display-l text-paper">
          {/* words land one after another once the projector has lit the screen (1.1s) */}
          <RevealText className="block" text={t("footer.headline1")} show={on} delay={1.1} />
          <RevealText className="block" text={t("footer.headline2")} show={on} delay={revealDuration(t("footer.headline1"), 1.1) - 0.2} />
        </h2>
        <p className="footer-line mt-6 text-[18px] text-muted" style={{ transitionDelay: `${revealDuration(t("footer.headline2"), revealDuration(t("footer.headline1"), 1.1) - 0.2)}s` }}>
          {t("footer.sub")}
        </p>
        <div className="footer-line mt-8 flex justify-center" style={{ transitionDelay: `${revealDuration(t("footer.headline2"), revealDuration(t("footer.headline1"), 1.1) - 0.2) + 0.12}s` }}>
          <ButtonLink href="/book" icon="ticket">
            {t("common.buyTickets")}
          </ButtonLink>
        </div>
      </div>

      {/* links */}
      <div className="relative z-10 mx-auto mt-24 max-w-[1200px] px-8">
        <div className="grid grid-cols-2 gap-10 border-t border-white/10 pt-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Image src="/brand/logo-white.png" alt="Star Cineplex" width={1200} height={499} className="h-[72px] w-auto" />
            <p className="mt-4 max-w-[260px] text-[15px] text-muted">{t("footer.brandLine")}</p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h3 id="footer-explore" className="mb-4 text-[14px] font-semibold text-white">
              {t("footer.explore")}
            </h3>
            <ul className="space-y-3 text-[15px] text-muted">
              <li><a href="/#now-showing" onClick={goTo("now-showing")} className="footer-link focus-ring">{t("nav.nowShowing")}</a></li>
              <li><a href="/#coming-soon" onClick={goTo("coming-soon")} className="footer-link focus-ring">{t("nav.comingSoon")}</a></li>
              <li><Link href="/book" className="footer-link focus-ring">{t("nav.showtimes")}</Link></li>
              {/* Prices slide-over panel: Phase 8 */}
              <li><button type="button" onClick={() => showPanel("prices")} aria-haspopup="dialog" className="footer-link focus-ring">{t("nav.prices")}</button></li>
              <li><a href="/#branches" onClick={goTo("branches")} className="footer-link focus-ring">{t("nav.branches")}</a></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h3 id="footer-help" className="mb-4 text-[14px] font-semibold text-white">
              {t("footer.help")}
            </h3>
            <ul className="space-y-3 text-[15px] text-muted">
              {/* My tickets: Phase 8 */}
              <li><button type="button" onClick={openTickets} className="footer-link focus-ring">{t("nav.myTickets")}</button></li>
              <li><button type="button" onClick={() => setAbout(true)} className="footer-link focus-ring">{t("nav.about")}</button></li>
              <li>
                <a href={`tel:${PHONE}`} className="footer-link focus-ring inline-flex items-center gap-2">
                  <Icon name="phone" size={16} />
                  <span className="tabular-nums">{PHONE}</span>
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="mb-4 text-[14px] font-semibold text-white">{t("footer.follow")}</h3>
            <ul className="flex items-center gap-4">
              {SOCIAL.map((s) => (
                <li key={s.key}>
                  <a href={s.href} aria-label={s.label} className="footer-link focus-ring grid size-10 place-items-center rounded-pill border border-white/10">
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden>
                      <path d={SOCIAL_PATHS[s.key]} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* small print */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 py-8 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>{t("footer.copyright")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t("footer.designCredit")}</span>
            <LangToggle />
          </div>
        </div>
      </div>

      <AboutPanel open={about} onClose={() => setAbout(false)} />
    </footer>
  );
}
