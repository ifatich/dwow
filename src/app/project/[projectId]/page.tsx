"use client";

import { use, useState, useEffect } from "react";
import KanbanBoard from "@/features/kanban/components/kanban-board";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import MetadataSection from "@/features/task/components/metadata-section";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const currentUser = useCurrentUser();
  const decodedId = decodeURIComponent(projectId);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id || data.title) {
          setProject(data);
        }
      })
      .catch(() => {});
  }, [projectId]);

  const projectTitle = project?.title || decodedId;

  return (
    <div className="flex flex-col flex-1">
      <PageHeader>
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: projectTitle },
        ]}
      />

      <div className="flex-1">
        {project && (
          <div className="max-w-[1280px] mx-auto px-xl pt-lg pb-xs">
            <div className="flex items-center gap-md flex-wrap mb-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40 bg-surface-soft rounded-pill px-sm py-xxs">
                {project.sprint}
              </span>
            </div>

            <h1 className="text-[26px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink mb-xs">
              {project.title}
            </h1>

            <div className="flex items-center gap-md text-[14px] text-ink/50 mb-sm">
              <span>Lead: <strong className="text-ink/70 capitalize">{project.lead}</strong></span>
              <span>Sprint: <strong className="text-ink/70">{project.sprint}</strong></span>
            </div>

            <MetadataSection
              description={project.description}
              goals={project.goals}
              dod={project.dod}
            />
          </div>
        )}

        <KanbanBoard projectId={projectId} currentUser={currentUser?.username} />
      </div>
    </div>
  );
}
