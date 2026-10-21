"use client";

import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import MasterTaskManager from "@/features/master-category/components/master-task-manager";
import MasterCategoryManager from "@/features/master-category/components/master-category-manager";
import TeamRosterManager from "@/features/master-category/components/team-roster-manager";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

export default function MasterDataPage() {
  const currentUser = useCurrentUser();

  const role = currentUser?.role || "staff";
  const isReviewer = role === "lead" || role === "kadep" || role === "kadiv" || role === "super_admin";

  return (
    <div className="flex flex-col flex-1">
      <PageHeader>
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Master Data" },
        ]}
      />

      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          {/* Hero Section */}
          <div className="mb-xxl">
            <div>
              <span className="font-mono text-[12px] uppercase tracking-wider text-ink/40">
                Konfigurasi Fondasi
              </span>
              <h2 className="text-[36px] font-[340] tracking-[-0.54px] text-ink mt-xs">
                Master Data
              </h2>
              <p className="text-[15px] font-[320] text-ink/40 mt-sm max-w-[680px]">
                Kelola penugasan Lead pada level task, kategori proyek definitif, dan pemetaan struktur tim roster secara terpusat.
              </p>
            </div>
          </div>

          {/* Access Notice for non-reviewers */}
          {!isReviewer ? (
            <div className="bg-canvas border border-hairline rounded-2xl p-xxxl text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-[550] text-ink">Akses Terbatas</h3>
              <p className="text-[13px] font-[320] text-ink/40 mt-1 max-w-[420px] mx-auto">
                Halaman Master Data hanya dapat diakses dan diubah oleh Lead, Kadep, Kadiv, atau Super Admin.
              </p>
            </div>
          ) : (
            <div className="space-y-xxl">
              {/* DAFTAR & PENUGASAN LEAD TASK */}
              <section id="master-tasks">
                <MasterTaskManager />
              </section>

              {/* MASTER DATA KATEGORI PROYEK */}
              <section id="master-categories">
                <MasterCategoryManager />
              </section>

              {/* STRUKTUR TIM & ANGGOTA ROSTER */}
              <section id="team-roster">
                <TeamRosterManager />
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
