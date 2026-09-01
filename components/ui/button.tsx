"use client";

import { useAccess } from "@/hooks/useAccess";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  CodeAccess?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  hideIfNoAccess?: boolean; // default true: do not render if missing permission
};

const variantCls: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high",
  ghost: "bg-transparent text-primary hover:bg-primary-container/50",
  danger: "bg-error text-on-error hover:opacity-90",
};

const sizeCls: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  CodeAccess,
  variant = "primary",
  size = "md",
  hideIfNoAccess = true,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const { has, loading } = useAccess();

  const allowed = !CodeAccess || has(CodeAccess);

  if (CodeAccess && !allowed) {
    if (hideIfNoAccess) return null;
    return (
      <button
        {...rest}
        disabled
        aria-disabled="true"
        className={`inline-flex items-center justify-center rounded-full font-semibold transition opacity-40 cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      {...rest}
      disabled={disabled || (CodeAccess ? loading : false)}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${className}`}
    >
      {children}
    </button>
  );
}
