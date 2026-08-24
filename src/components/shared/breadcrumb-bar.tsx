"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbBarProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb bar di bawah header.
 * Menampilkan jalur navigasi: TaskFlow Pro / Page / Subpage
 */
export default function BreadcrumbBar({ items }: BreadcrumbBarProps) {
  return (
    <div className="bg-surface-soft/30 border-b border-hairline">
      <div className="max-w-[1280px] mx-auto px-xl h-[36px] flex items-center gap-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-sm">
              {i > 0 && (
                <span className="text-ink/15 text-[16px] font-[200]">/</span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-[13px] font-[450] text-ink/40 hover:text-ink/70 transition-colors capitalize"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[13px] font-[480] text-ink/60 capitalize truncate max-w-[400px]">
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
