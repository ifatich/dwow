"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import CustomDropdown from "@/components/ui/custom-dropdown";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import UserAvatar from "@/components/shared/user-avatar";

export interface MasterTaskItem {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  picName: string;
  picAvatar?: string | null;
  picUserId?: string | null;
  deadline: string;
  projectId: string;
  projectTitle: string;
  sprint: string;
  leadId: string | null;
  leadName: string | null;
  leadUsername: string | null;
  leadRole: string | null;
  leadAvatar?: string | null;
  projectLeadName: string | null;
  subtaskTotal: number;
  subtaskDone: number;
  subtaskReview: number;
  subtaskInProgress: number;
  totalHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableLeadUser {
  id: string;
  nama: string;
  username: string;
  role: string;
  department?: string | null;
  avatar?: string | null;
}

/**
 * Komponen Pengelola Seluruh Data Task & Penugasan Lead
 * Bergaya konsisten dengan Master Kategori Project & Lead PIC lengkap dengan filter yang dapat disembunyikan.
 */
export default function MasterTaskManager() {
  const [tasks, setTasks] = useState<MasterTaskItem[]>([]);
  const [availableLeads, setAvailableLeads] = useState<AvailableLeadUser[]>([]);
  const [sprints, setSprints] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Visibility
  const [showFilter, setShowFilter] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedLeadFilter, setSelectedLeadFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Updating state & feedback inline
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/master/tasks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setTasks(data.tasks || []);
          setAvailableLeads(data.availableLeads || []);
          setSprints(data.sprints || []);
          setProjects(data.projects || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Gagal mengambil daftar task:", err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleLeadChange = async (taskId: string, newLeadId: string) => {
    setUpdatingTaskId(taskId);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/master/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          leadId: newLeadId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengubah lead task");
      }

      const selectedLead = availableLeads.find((l) => l.id === newLeadId);

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              leadId: newLeadId || null,
              leadName: selectedLead?.nama || null,
              leadUsername: selectedLead?.username || null,
              leadRole: selectedLead?.role || null,
            };
          }
          return t;
        })
      );

      setSaveMessage({
        id: taskId,
        text: selectedLead ? `Diubah ke ${selectedLead.nama}` : "Dikosongkan",
        success: true,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal mengubah lead";
      setSaveMessage({
        id: taskId,
        text: errMsg,
        success: false,
      });
    } finally {
      setUpdatingTaskId(null);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (selectedSprint !== "all") count++;
    if (selectedProject !== "all") count++;
    if (selectedLeadFilter !== "all") count++;
    return count;
  }, [search, selectedSprint, selectedProject, selectedLeadFilter]);

  // Filtering calculation
  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase().trim();

    return tasks.filter((t) => {
      // Search
      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchTicket = t.ticketId.toLowerCase().includes(q);
        const matchPic = t.picName.toLowerCase().includes(q);
        const matchProject = t.projectTitle.toLowerCase().includes(q);
        const matchLead = (t.leadName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchTicket && !matchPic && !matchProject && !matchLead) {
          return false;
        }
      }

      // Filter Sprint
      if (selectedSprint !== "all" && t.sprint !== selectedSprint) {
        return false;
      }

      // Filter Proyek
      if (selectedProject !== "all" && t.projectTitle !== selectedProject) {
        return false;
      }

      // Filter Lead
      if (selectedLeadFilter === "unassigned") {
        if (t.leadId !== null) return false;
      } else if (selectedLeadFilter !== "all") {
        if (t.leadId !== selectedLeadFilter) return false;
      }

      return true;
    });
  }, [tasks, search, selectedSprint, selectedProject, selectedLeadFilter]);

  // Pagination calculation
  const totalPages = Math.max(Math.ceil(filteredTasks.length / pageSize), 1);
  const activePage = Math.min(currentPage, totalPages);
  const paginatedTasks = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, activePage, pageSize]);

  // Summary Metrics
  const totalTasksCount = tasks.length;
  const assignedLeadsCount = tasks.filter((t) => Boolean(t.leadId)).length;
  const unassignedLeadsCount = totalTasksCount - assignedLeadsCount;

  return (
    <section id="master-tasks" className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg shadow-xs">
      {/* Header Container matching MasterCategoryManager */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md pb-md border-b border-hairline">
        <div>
          <div className="flex items-center gap-xs flex-wrap">
            <h3 className="text-[16px] font-[540] text-ink">Daftar & Penugasan Lead Task</h3>
            <span className="text-[11px] font-[540] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {totalTasksCount} Task
            </span>
            {unassignedLeadsCount > 0 && (
              <span className="text-[11px] font-[540] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {unassignedLeadsCount} Belum Ada Lead
              </span>
            )}
          </div>
          <p className="text-[12px] font-[320] text-ink/45 mt-0.5">
            Daftar seluruh task yang terdata. Tentukan Lead penanggung jawab pada setiap task secara spesifik.
          </p>
        </div>

        {/* Action Button: Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilter((prev) => !prev)}
          className={`h-[36px] rounded-lg px-md border border-hairline text-[12px] font-[540] transition-colors flex items-center justify-center gap-xs cursor-pointer flex-shrink-0 select-none ${
            showFilter
              ? "bg-surface-soft text-ink border-ink/20"
              : "bg-canvas text-ink/70 hover:bg-surface-soft/60"
          }`}
          title={showFilter ? "Sembunyikan bilah filter" : "Tampilkan bilah filter"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink/60">
            <polygon
              points="2 3 14 3 9.5 8.5 9.5 13 6.5 14.5 6.5 8.5 2 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{showFilter ? "Sembunyikan Filter" : "Filter Tampilan"}</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-[600] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Component yang bisa di-hide */}
      <Collapsible open={showFilter} onOpenChange={setShowFilter}>
        <CollapsibleContent className="transition-all animate-fadeIn">
          <div className="flex items-center gap-sm flex-wrap pb-xs">
            {/* Search Box dengan rounded pill & search icon sesuai gambar */}
            <div className="relative flex-1 min-w-[220px] max-w-[320px]">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari ticket, judul, PIC..."
                className="w-full h-[36px] rounded-lg border border-hairline px-lg pl-9 text-[13px] text-ink bg-canvas hover:border-ink/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-2xs"
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-[12px] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown: Semua Sprint */}
            <div className="min-w-[150px]">
              <CustomDropdown
                value={selectedSprint}
                onChange={(val) => {
                  setSelectedSprint(val);
                  setCurrentPage(1);
                }}
                allOptionLabel="Semua Sprint"
                allOptionValue="all"
                options={sprints.map((s) => ({ value: s, label: s }))}
                placeholder="Semua Sprint"
              />
            </div>

            {/* Dropdown: Semua Proyek */}
            <div className="min-w-[170px]">
              <CustomDropdown
                value={selectedProject}
                onChange={(val) => {
                  setSelectedProject(val);
                  setCurrentPage(1);
                }}
                allOptionLabel="Semua Proyek"
                allOptionValue="all"
                options={projects.map((p) => ({ value: p, label: p }))}
                placeholder="Semua Proyek"
              />
            </div>

            {/* Dropdown: Semua Lead */}
            <div className="min-w-[160px]">
              <CustomDropdown
                value={selectedLeadFilter}
                onChange={(val) => {
                  setSelectedLeadFilter(val);
                  setCurrentPage(1);
                }}
                allOptionLabel="Semua Lead"
                allOptionValue="all"
                options={[
                  { label: "⚠️ Belum Ada Lead", value: "unassigned" },
                  ...availableLeads.map((l) => ({
                    value: l.id,
                    label: l.nama,
                    icon: <UserAvatar name={l.nama} avatar={l.avatar} size="xs" />,
                  })),
                ]}
                placeholder="Semua Lead"
              />
            </div>

            {/* Tombol Reset Filter jika ada filter aktif */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedSprint("all");
                  setSelectedProject("all");
                  setSelectedLeadFilter("all");
                  setCurrentPage(1);
                }}
                className="text-[12px] font-[480] text-red-600 hover:underline cursor-pointer ml-xs transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table Section matching MasterCategoryManager */}
      {loading ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Memuat data task...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Tidak ada data task yang sesuai dengan kriteria filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-[11px] font-[540] text-ink/40 uppercase tracking-wider">
                <th className="py-sm px-md">Task & Proyek</th>
                <th className="py-sm px-md">Tiket & Sprint</th>
                <th className="py-sm px-md">PIC Staf</th>
                <th className="py-sm px-md">Lead Penanggung Jawab</th>
                <th className="py-sm px-md text-right">Relasi Subtask</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {paginatedTasks.map((task) => {
                const isUpdating = updatingTaskId === task.id;
                const feedback = saveMessage?.id === task.id ? saveMessage : null;

                return (
                  <tr key={task.id} className="hover:bg-surface-soft/40 transition-colors">
                    {/* Task & Proyek */}
                    <td className="py-md px-md max-w-[320px]">
                      <Link
                        href={`/project/${task.projectId}/task/${task.id}`}
                        className="font-[520] text-ink hover:text-primary transition-colors block line-clamp-2"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                      <div className="text-[11px] text-ink/40 truncate mt-0.5">
                        📁 {task.projectTitle}
                      </div>
                    </td>

                    {/* Tiket & Sprint */}
                    <td className="py-md px-md whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-mono text-[11px] font-[540] px-2 py-0.5 rounded bg-surface-soft text-ink/70 border border-hairline">
                          {task.ticketId}
                        </span>
                        <span className="text-[10px] font-mono text-ink/45">
                          {task.sprint}
                        </span>
                      </div>
                    </td>

                    {/* PIC Staf */}
                    <td className="py-md px-md whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={task.picName}
                          avatar={task.picAvatar}
                          size="md"
                        />
                        <span className="font-[500] text-ink/80">{task.picName}</span>
                      </div>
                    </td>

                    {/* Lead Penanggung Jawab with CustomDropdown and inline feedback */}
                    <td className="py-md px-md">
                      <div className="flex items-center gap-xs">
                        <CustomDropdown
                          value={task.leadId || ""}
                          disabled={isUpdating}
                          onChange={(val) => handleLeadChange(task.id, val)}
                          allOptionLabel="— Belum Ditentukan —"
                          allOptionValue=""
                          minWidth="180px"
                          options={availableLeads.map((lead) => ({
                            value: lead.id,
                            label: lead.nama,
                            icon: <UserAvatar name={lead.nama} avatar={lead.avatar} size="xs" />,
                          }))}
                        />

                        {isUpdating && (
                          <span className="text-[11px] text-ink/40 animate-pulse">Menyimpan...</span>
                        )}

                        {feedback && (
                          <span
                            className={`text-[11px] font-[500] ${
                              feedback.success ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {feedback.success ? "✅ " : "❌ "}
                            {feedback.text}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Relasi Subtask */}
                    <td className="py-md px-md text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-[450] text-ink/50 bg-surface-soft/60 px-2 py-0.5 rounded-full">
                          {task.subtaskDone}/{task.subtaskTotal} subtasks
                        </span>
                        {task.subtaskReview > 0 && (
                          <span className="text-[10px] font-[500] text-amber-600">
                            ({task.subtaskReview} review)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredTasks.length > pageSize && (
        <div className="pt-md border-t border-hairline flex items-center justify-between text-[12px] text-ink/50">
          <span>
            Menampilkan {((activePage - 1) * pageSize) + 1} - {Math.min(activePage * pageSize, filteredTasks.length)} dari {filteredTasks.length} task
          </span>

          <div className="flex items-center gap-xs">
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(Math.min(p, totalPages) - 1, 1))}
              className="h-[30px] px-sm rounded-lg border border-hairline bg-canvas text-ink/70 hover:bg-surface-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] font-[500] cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="font-mono text-[11px] px-1 text-ink/70">
              {activePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(Math.min(p, totalPages) + 1, totalPages))}
              className="h-[30px] px-sm rounded-lg border border-hairline bg-canvas text-ink/70 hover:bg-surface-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[11px] font-[500] cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
