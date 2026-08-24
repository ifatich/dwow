/**
 * Re-export dari fitur activity-service.
 * File ini tetap ada untuk backward compatibility — semua logic ada di features/task/services/activity-service.ts.
 */
export {
  logSubtaskActivity,
  logTaskActivity,
  getSubtaskActivityLog,
  getStaffActivityLog,
  getAllActivityLogs,
} from "@/features/task/services/activity-service";
