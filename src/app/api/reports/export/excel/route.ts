import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

/**
 * POST /api/reports/export/excel
 * Generate laporan Excel dengan 3 sheet: Ringkasan, Per Individu, Per Task.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const period = body.period || "bulanan";
    const username = body.username || "all";
    const sprint = body.sprint || "all";
    const periodLabel = period === "kuartalan" ? "Kuartalan" : "Bulanan";

    // Fetch data
    const baseUrl = request.nextUrl.origin;
    const [reportsRes, sprintsRes] = await Promise.all([
      fetch(`${baseUrl}/api/reports?period=${period}&username=${username}&sprint=${sprint}`),
      fetch(`${baseUrl}/api/sprints`),
    ]);
    const data = await reportsRes.json();
    const sprints = await sprintsRes.json();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TaskFlow Pro";

    // Sheet 1: Ringkasan
    const ws1 = workbook.addWorksheet("Ringkasan");
    ws1.columns = [
      { header: "Metrik", key: "label", width: 28 },
      { header: "Nilai", key: "value", width: 18 },
    ];
    ws1.addRows([
      { label: "Rata-rata Skor Kinerja", value: `${data.summary?.avgPerformanceScore || 0} / 100` },
      { label: "Total Tugas", value: data.summary?.totalTasks || 0 },
      { label: "Tugas Selesai", value: data.summary?.doneTasks || 0 },
      { label: "Completion Rate", value: `${data.summary?.completionRate || 0}%` },
      { label: "Total Beban Kerja", value: `${data.summary?.totalWorkload || 0} jam` },
      { label: "Total Kapasitas Tim", value: `${data.summary?.totalCapacity || 0} jam` },
      { label: "Top Performers", value: data.summary?.topPerformersCount || 0 },
      { label: "Optimal", value: data.summary?.optimalCount || 0 },
      { label: "Overload", value: data.summary?.overloadCount || 0 },
      { label: "Underutilized", value: data.summary?.underutilizedCount || 0 },
      { label: "Periode", value: periodLabel },
    ]);
    styleHeader(ws1);

    // Sheet 2: Per Individu
    const ws2 = workbook.addWorksheet("Per Individu");
    ws2.columns = [
      { header: "Nama", key: "name", width: 20 },
      { header: "Role", key: "role", width: 12 },
      { header: "Departemen", key: "department", width: 16 },
      { header: "Kapasitas (j/sprint)", key: "capacity", width: 18 },
      { header: "Beban (j)", key: "workload", width: 12 },
      { header: "Utilisasi", key: "utilization", width: 12 },
      { header: "Subtasks Done/Total", key: "subtasks", width: 18 },
      { header: "Review Lead (Done/Total)", key: "reviews", width: 22 },
      { header: "Skor Kinerja", key: "score", width: 14 },
      { header: "Kategori", key: "category", width: 16 },
    ];
    if (data.staff) {
      data.staff.forEach((s: any) => {
        ws2.addRow({
          name: s.name,
          role: (s.role || "staff").toUpperCase(),
          department: s.department || "Engineering",
          capacity: s.capacity,
          workload: s.workload,
          utilization: `${s.utilization}%`,
          subtasks: `${s.subtasksDone}/${s.subtasksTotal}`,
          reviews: s.role === "lead" ? `${s.reviewsDone}/${s.reviewsTotal}` : "-",
          score: `${s.performanceScore || 0}/100`,
          category: s.performanceCategory || (s.isOverload ? "Overload" : "Optimal"),
        });
      });
    }
    styleHeader(ws2);
    // Conditional formatting for overload
    ws2.eachRow((row, rowNum) => {
      if (rowNum > 1 && row.getCell(6).value === "OVERLOAD") {
        row.eachCell((cell) => { cell.font = { color: { argb: "FFDC2626" }, bold: true }; });
      }
    });

    // Sheet 3: Per Task (dari sprint data)
    const ws3 = workbook.addWorksheet("Per Task");
    ws3.columns = [
      { header: "Project", key: "project", width: 15 },
      { header: "Sprint", key: "sprint", width: 12 },
      { header: "Total Tasks", key: "total", width: 12 },
      { header: "Done", key: "done", width: 10 },
      { header: "Status", key: "status", width: 12 },
    ];
    if (Array.isArray(sprints)) {
      sprints.forEach((s: any) => {
        ws3.addRow({
          project: s.name, sprint: s.sprint, total: s.totalTasks,
          done: s.doneTasks, status: s.isArchived ? "Archived" : "Active",
        });
      });
    }
    styleHeader(ws3);

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-taskflow-${period}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function styleHeader(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  ws.getRow(1).alignment = { horizontal: "center" };
}
