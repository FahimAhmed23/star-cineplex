"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* Hover effect adapted from Uiverse.io by thisSasha (MIT) — styles live in app/globals.css (.btn) */

type Variant = "primary" | "secondary" | "primary-light" | "white";
type Size = "lg" | "sm" | "xs";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

const classes = (variant: Variant, size: Size, className?: string) =>
  ["btn", `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(" ");

function Content({ icon, loading, children, size }: Pick<CommonProps, "icon" | "loading" | "children" | "size">) {
  if (loading) {
    // keep the button width: render the label invisibly under the spinner
    return (
      <>
        <span className="invisible inline-flex items-center gap-2" aria-hidden>
          {icon && <Icon name={icon} size={size === "lg" ? 20 : 18} />}
          {children}
        </span>
        <span className="absolute inset-0 grid place-items-center" role="status">
          <span className="btn-spinner" />
        </span>
      </>
    );
  }
  return (
    <>
      {icon && <Icon name={icon} size={size === "lg" ? 20 : 18} />}
      {children}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "lg",
  icon,
  loading,
  children,
  className,
  disabled,
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, keyof CommonProps>) {
  return (
    <button
      type="button"
      className={classes(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={icon} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "lg",
  icon,
  children,
  className,
  href,
  ...rest
}: Omit<CommonProps, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      <Content icon={icon} size={size}>
        {children}
      </Content>
    </Link>
  );
}
