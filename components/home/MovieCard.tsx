"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { dateLocale } from "@/lib/demo-date";
import { useT } from "@/lib/i18n";
import type { Movie } from "@/lib/types";

export function releaseLabel(iso: string, lang = "en") {
  // "28 Nov" — Latin digits in both languages (§5 Language)
  return new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" });
}

interface Props {
  movie: Movie;
  /** Now Showing: card → showtimes. Coming Soon: card → trailer (§8.6) */
  variant: "now" | "soon";
  /** opens the Trailer view; gets the poster element for the shared-element expand (§8.7) */
  onPlayTrailer: (movie: Movie, from: HTMLElement) => void;
  priority?: boolean;
  /** hidden copies (collapsed grid, off-screen slides) stay out of the tab order */
  inert?: boolean;
  /** Now Showing on 375–575px screens: tags + play on the poster, title / genres / meta below it (designer, Nov 27) */
  strip?: boolean;
}

/**
 * MovieCard (CLAUDE.md §8.4): a full-bleed 2:3 poster; on hover it lifts, the poster darkens and the
 * details slide up inside the card (meta, genres, Play trailer). Touch: first tap reveals, second acts.
 */
export function MovieCard({ movie, variant, onPlayTrailer, priority, inert, strip }: Props) {
  const { t, lang } = useT();
  const [touchOpen, setTouchOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const title = (lang === "bn" && movie.titleBn) || movie.title;
  const runtime = movie.runtimeMin ? t("hero.minutes", { h: Math.floor(movie.runtimeMin / 60), m: movie.runtimeMin % 60 }) : null;
  const isTouch = () => typeof window !== "undefined" && window.matchMedia("(hover: none) and (min-width: 1024px)").matches;

  const playTrailer = () => posterRef.current && onPlayTrailer(movie, posterRef.current);

  /** first tap on touch reveals the details; the second tap (or the button) acts */
  const guardTouch = (e: React.MouseEvent) => {
    if (isTouch() && !touchOpen) {
      e.preventDefault();
      setTouchOpen(true);
      return true;
    }
    return false;
  };

  return (
    <article
      className={`movie-card group ${strip ? "movie-card--strip" : ""} ${touchOpen ? "is-open" : ""}`}
      data-card-slug={movie.slug}
      inert={inert || undefined}
      onMouseLeave={() => setTouchOpen(false)}
    >
      <div ref={posterRef} className="movie-card__frame">
        <Image
          src={movie.poster}
          alt=""
          fill
          // real drawn widths (Nov 28): Now Showing phone row ~64vw (max 300px); Coming Soon 2 / 3 / 4 per row
          sizes={
            variant === "now"
              ? "(max-width: 575px) 300px, (min-width: 1280px) 302px, 25vw"
              : "(max-width: 639px) 50vw, (max-width: 959px) 34vw, (min-width: 1280px) 302px, 25vw"
          }
          className="object-cover"
          priority={priority}
        />
        <div aria-hidden className="movie-card__shade" />

        {/* top-left: IMDb rating (now showing) or release date (coming soon) */}
        {variant === "now" && movie.imdbRating != null && (
          <span className="movie-card__pill" aria-label={t("cards.imdb", { r: movie.imdbRating.toFixed(1) })}>
            <Icon name="star" size={14} />
            {movie.imdbRating.toFixed(1)}
          </span>
        )}
        {variant === "soon" && (
          <span className="movie-card__pill" aria-label={t("cards.releases", { date: releaseLabel(movie.releaseDate, lang) })}>
            <Icon name="calendar" size={14} />
            {releaseLabel(movie.releaseDate, lang)}
          </span>
        )}

        {/* the whole card is the main action: showtimes (now) / trailer (soon) */}
        {variant === "now" ? (
          <Link
            href={`/book?movie=${movie.slug}`}
            className="movie-card__hit focus-ring"
            aria-label={t("cards.showtimesFor", { title })}
            onClick={(e) => guardTouch(e)}
          />
        ) : (
          <button
            type="button"
            className="movie-card__hit focus-ring"
            aria-label={t("cards.trailerFor", { title })}
            onClick={(e) => !guardTouch(e) && playTrailer()}
          />
        )}

        {strip && (
          <>
            <ul className="movie-card__tags" aria-hidden>
              {movie.certificate && <li className="movie-card__tag movie-card__tag--cert">{movie.certificate}</li>}
              <li className="movie-card__tag movie-card__tag--format">{movie.format}</li>
            </ul>
            <button type="button" className="movie-card__play-icon focus-ring" aria-label={t("cards.trailerFor", { title })} onClick={playTrailer}>
              <Icon name="play" size={14} />
            </button>
          </>
        )}

        <div className="movie-card__info">
          <h3 className="movie-card__title" lang={lang === "bn" && movie.titleBn ? "bn" : "en"}>
            {title}
          </h3>
          <div className="movie-card__more">
            <div className="movie-card__more-inner">
            <ul className="movie-card__meta" style={{ transitionDelay: "40ms" }}>
              {movie.certificate && <li className="movie-card__cert">{movie.certificate}</li>}
              {runtime && <li>{runtime}</li>}
              <li>{movie.language}</li>
              <li className="movie-card__format">{movie.format}</li>
            </ul>
            <ul className="movie-card__genres" aria-label={t("cards.genres")} style={{ transitionDelay: "80ms" }}>
              {movie.genres.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-sm movie-card__play"
              style={{ transitionDelay: "120ms" }}
              onClick={playTrailer}
            >
              <Icon name="play" size={18} />
              {t("common.playTrailer")}
            </button>
            </div>
          </div>
        </div>
      </div>

      {strip && (
        <div className="movie-card__below">
          <h3 className="movie-card__below-title" lang={lang === "bn" && movie.titleBn ? "bn" : "en"}>
            <Link href={`/book?movie=${movie.slug}`} className="focus-ring">
              {title}
            </Link>
          </h3>
          <ul className="movie-card__below-genres" aria-label={t("cards.genres")}>
            {movie.genres.slice(0, 1).map((g) => (
              <li key={g}>{g}</li>
            ))}
            {movie.genres.length > 1 && <li>+{movie.genres.length - 1}</li>}
          </ul>
          <p className="movie-card__below-meta">
            {movie.imdbRating != null && (
              <span className="movie-card__below-rating" aria-label={t("cards.imdb", { r: movie.imdbRating.toFixed(1) })}>
                <Icon name="star" size={14} />
                {movie.imdbRating.toFixed(1)}
              </span>
            )}
            <span>{[movie.language, runtime].filter(Boolean).join(" · ")}</span>
          </p>
        </div>
      )}
    </article>
  );
}
