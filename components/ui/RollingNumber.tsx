"use client";

/**
 * A number whose digits roll to the new value (reference video B: the price on "Book seats" rolls when the
 * ticket count changes). Non-digit characters (৳, commas) stay put. Reduced motion: no roll (CSS).
 */
export function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`rolling ${className}`} aria-label={value}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={`${value.length}-${i}`} className="rolling__slot" aria-hidden>
            <span className="rolling__reel" style={{ transform: `translateY(-${+ch * 10}%)` }}>
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${value.length}-${i}`} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
