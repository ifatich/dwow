export interface AddedItemTask {
  id?: string;
  ticketId?: string;
  title: string;
  categoryName: string;
  pic: string;
}

export interface AddedItemSubtask {
  id?: string;
  title: string;
  taskTitle: string;
  categoryName: string;
  workloadHours: number;
  assignees: string[];
}

export interface AvailableSprint {
  identifier: string; // e.g. "186"
  label: string; // e.g. "Sprint 186"
  rowCount: number;
  isInDatabase: boolean;
}

export interface SprintSyncPreview {
  sprintIdentifier: string;
  sprintLabel: string;
  totalRawRows: number;
  excludedTentativeZero: number;
  validRows: number;
  uniqueSubtasksCount: number;
  projectsCount: number;
  tasksCount: number;
  totalWorkloadHours: number;
  contributors: { name: string; hours: number }[];
  categories: {
    categoryName: string;
    tasksCount: number;
    subtasksCount: number;
    totalHours: number;
  }[];
  delta: {
    existingProjectsInSprint: number;
    newProjectsCount: number;
    existingTasksInSprint: number;
    newTasksCount: number;
    existingSubtasksInSprint: number;
    newSubtasksCount: number;
    preservedInProgressSubtasks: number;
  };
  detectedNewItems?: {
    newTasks: AddedItemTask[];
    newSubtasks: AddedItemSubtask[];
  };
  warnings?: string[];
}

export interface SprintSyncResult {
  success: boolean;
  message: string;
  sprintLabel: string;
  projectsCreated: number;
  projectsUpdated: number;
  tasksCreated: number;
  tasksUpdated: number;
  subtasksCreated: number;
  subtasksPreserved: number;
  subtasksUpdated: number;
  totalWorkloadHours: number;
  syncedAt: string;
  addedItems?: {
    newTasks: AddedItemTask[];
    newSubtasks: AddedItemSubtask[];
  };
}
