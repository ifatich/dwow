"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

function CustomCheckbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-[4px] border transition-all flex items-center justify-center flex-shrink-0 ${checked
        ? "bg-ink border-ink text-white shadow-xs scale-105"
        : "border-hairline bg-white group-hover:border-ink/40"
        }`}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1.5 4L3.8 6.3L8.5 1.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

interface GlobalFilterToolbarProps {
  userValue: string;
  onUserChange: (val: string) => void;
  sprintValue: string;
  onSprintChange: (val: string) => void;
  hideUserFilter?: boolean;
  hideSprintFilter?: boolean;
}

export default function GlobalFilterToolbar({
  userValue,
  onUserChange,
  sprintValue,
  onSprintChange,
  hideUserFilter = false,
  hideSprintFilter = false,
}: GlobalFilterToolbarProps) {
  const [usersList, setUsersList] = useState<{ username: string; name: string; role?: string }[]>([]);
  const [sprintsList, setSprintsList] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const [isOpenUser, setIsOpenUser] = useState(false);
  const [isOpenSprint, setIsOpenSprint] = useState(false);
  const [isMainOpen, setIsMainOpen] = useState(true);

  const userRef = useRef<HTMLDivElement>(null);
  const sprintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch users for dropdown with fallback parsing
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        let rawList: any[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && Array.isArray(data.users)) {
          rawList = data.users;
        } else if (data && Array.isArray(data.data)) {
          rawList = data.data;
        }

        if (rawList.length > 0) {
          setUsersList(
            rawList.map((u: any) => ({
              username: u.username || u.id || u.nama,
              name: u.nama || u.name || u.username || "User",
              role: u.role || "",
            }))
          );
        } else {
          // Fallback fetch from reports
          fetch("/api/reports?period=bulanan")
            .then((r) => r.json())
            .then((rd) => {
              if (rd && Array.isArray(rd.staff)) {
                setUsersList(rd.staff.map((s: any) => ({ username: s.username, name: s.name || s.username })));
              }
            })
            .catch(() => { });
        }
      })
      .catch(() => {
        // Fallback fetch from reports
        fetch("/api/reports?period=bulanan")
          .then((r) => r.json())
          .then((rd) => {
            if (rd && Array.isArray(rd.staff)) {
              setUsersList(rd.staff.map((s: any) => ({ username: s.username, name: s.name || s.username })));
            }
          })
          .catch(() => { });
      });

    // Fetch sprints for dropdown
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((data) => {
        let rawList: any[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && Array.isArray(data.sprints)) {
          rawList = data.sprints;
        }
        const names = rawList.map((s: any) => s.sprint || s.name || s).filter(Boolean);
        setSprintsList(names);
      })
      .catch(() => { });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsOpenUser(false);
      }
      if (sprintRef.current && !sprintRef.current.contains(event.target as Node)) {
        setIsOpenSprint(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Multi-select user parsing
  const selectedUserArray = useMemo(() => {
    if (!userValue || userValue === "all") return [];
    return userValue.split(",").filter(Boolean);
  }, [userValue]);

  const toggleUserSelect = (username: string) => {
    if (username === "all") {
      onUserChange("all");
      return;
    }

    let newSelected: string[];
    if (selectedUserArray.includes(username)) {
      newSelected = selectedUserArray.filter((u) => u !== username);
    } else {
      newSelected = [...selectedUserArray, username];
    }

    if (newSelected.length === 0) {
      onUserChange("all");
    } else {
      onUserChange(newSelected.join(","));
    }
  };

  const userDisplayLabel = useMemo(() => {
    if (selectedUserArray.length === 0) return "Semua User";
    if (selectedUserArray.length === 1) {
      const uObj = usersList.find((u) => u.username === selectedUserArray[0]);
      return uObj ? `${uObj.name}` : selectedUserArray[0];
    }
    return `${selectedUserArray.length} User Dipilih`;
  }, [selectedUserArray, usersList]);

  const sprintDisplayLabel = sprintValue === "all" ? "Semua Sprint (Awal Tahun)" : sprintValue;

  const filteredUsersList = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  return (
    <Collapsible open={isMainOpen} onOpenChange={setIsMainOpen} className="bg-canvas border border-hairline rounded-lg p-md mb-lg shadow-xs transition-all">
      <div className="flex items-center justify-between gap-md flex-wrap">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-xs cursor-pointer group focus:outline-none select-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink/40 group-hover:text-ink/70 transition-colors">
              <polygon points="2 3 14 3 9.5 8.5 9.5 13 6.5 14.5 6.5 8.5 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/60 group-hover:text-ink font-[540] transition-colors">
              Filter Tampilan
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16" fill="none"
              className={`text-ink/40 transition-transform duration-200 ${isMainOpen ? "rotate-180" : "rotate-0"}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="w-full sm:w-auto">
          <div className="flex items-center gap-md flex-wrap mt-sm sm:mt-0">
            {/* User Filter Collapsible Dropdown */}
            {!hideUserFilter && (
              <div ref={userRef} className="relative flex items-center gap-xs">
                <label className="text-[12px] font-[450] text-ink/50">User:</label>
                <Collapsible open={isOpenUser} onOpenChange={setIsOpenUser} className="relative">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="h-[34px] px-md rounded-md border border-hairline bg-surface-soft text-[13px] font-[480] text-ink focus:outline-none focus:border-ink/30 cursor-pointer flex items-center justify-between gap-sm min-w-[160px] text-left transition-colors"
                    >
                      <span className="truncate max-w-[180px]">{userDisplayLabel}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`text-ink/40 transition-transform duration-200 flex-shrink-0 ${isOpenUser ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="absolute z-50 left-0 mt-xs min-w-[260px] max-h-[300px] bg-white border border-hairline/80 rounded-md shadow-xl flex flex-col overflow-hidden animate-scale-in">
                    {/* Search box sticky top */}
                    <div className="p-xs px-sm border-b border-hairline/60 bg-surface-soft/40 backdrop-blur-md sticky top-0 z-10">
                      <div className="relative flex items-center">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-2.5 text-ink/35 pointer-events-none">
                          <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Cari user..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 text-[12px] bg-white border border-hairline rounded-md focus:outline-none focus:border-ink/40 text-ink placeholder:text-ink/30 transition-all shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {userSearch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserSearch("");
                            }}
                            className="absolute right-2 text-ink/30 hover:text-ink text-[12px] cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Users list */}
                    <div className="overflow-y-auto max-h-[230px] p-xs space-y-[2px]">
                      <button
                        type="button"
                        onClick={() => toggleUserSelect("all")}
                        className={`group w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center gap-sm ${selectedUserArray.length === 0 ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                          }`}
                      >
                        <CustomCheckbox checked={selectedUserArray.length === 0} />
                        <span>Semua User</span>
                      </button>

                      <div className="my-xs border-t border-hairline-soft" />

                      {filteredUsersList.length === 0 ? (
                        <div className="px-md py-md text-[12px] text-ink/40 text-center italic">User tidak ditemukan</div>
                      ) : (
                        filteredUsersList.map((u) => {
                          const isChecked = selectedUserArray.includes(u.username);
                          return (
                            <button
                              key={u.username}
                              type="button"
                              onClick={() => toggleUserSelect(u.username)}
                              className={`group w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center justify-between gap-sm ${isChecked ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                                }`}
                            >
                              <div className="flex items-center gap-sm truncate flex-1 min-w-0">
                                <CustomCheckbox checked={isChecked} />
                                <span className="truncate">{u.name}</span>
                              </div>
                              {u.role && (
                                <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-ink/40 bg-surface-soft px-xs py-[1px] rounded flex-shrink-0">
                                  {u.role}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Sprint Filter Collapsible Dropdown */}
            {!hideSprintFilter && (
              <div ref={sprintRef} className="relative flex items-center gap-xs">
                <label className="text-[12px] font-[450] text-ink/50">Sprint:</label>
                <Collapsible open={isOpenSprint} onOpenChange={setIsOpenSprint} className="relative">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="h-[34px] px-md rounded-md border border-hairline bg-surface-soft text-[13px] font-[480] text-ink focus:outline-none focus:border-ink/30 cursor-pointer flex items-center justify-between gap-sm min-w-[180px] text-left transition-colors"
                    >
                      <span className="truncate max-w-[200px]">{sprintDisplayLabel}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`text-ink/40 transition-transform duration-200 flex-shrink-0 ${isOpenSprint ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="absolute z-50 left-0 mt-xs min-w-[240px] max-h-[280px] overflow-y-auto bg-white border border-hairline/80 rounded-md shadow-xl p-xs space-y-[2px] animate-scale-in">
                    <button
                      type="button"
                      onClick={() => {
                        onSprintChange("all");
                        setIsOpenSprint(false);
                      }}
                      className={`w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center justify-between gap-sm ${sprintValue === "all" ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                        }`}
                    >
                      <span>Semua Sprint (Awal Tahun)</span>
                      {sprintValue === "all" && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-ink flex-shrink-0">
                          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <div className="my-xs border-t border-hairline-soft" />
                    {sprintsList.map((s) => {
                      const isSelected = sprintValue === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            onSprintChange(s);
                            setIsOpenSprint(false);
                          }}
                          className={`w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center justify-between gap-sm ${isSelected ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                            }`}
                        >
                          <span>{s}</span>
                          {isSelected && (
                            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-ink flex-shrink-0">
                              <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {(userValue !== "all" || sprintValue !== "all") && (
              <button
                type="button"
                onClick={() => {
                  onUserChange("all");
                  onSprintChange("all");
                }}
                className="text-[11px] font-[450] text-red-600 hover:underline cursor-pointer ml-xs"
              >
                Reset Filter
              </button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}


