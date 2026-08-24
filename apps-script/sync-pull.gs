/**
 * TaskFlow Pro — Google Apps Script: Sync Pull
 * Menarik data proyek dari Sheet → Next.js API (upsert ke database)
 *
 * Setup:
 * 1. Buka Google Sheets → Ekstensi → Apps Script
 * 2. Tempel code ini
 * 3. Deploy sebagai Web App (Jalankan sebagai: Saya, Akses: Siapa saja)
 * 4. Salin URL deployment → masukkan ke Settings > Apps Script URL
 *
 * Sheet structure yang diharapkan:
 *   Sheet "Projects": id | name | description | status | startDate | endDate
 */

const API_BASE_URL = "https://your-app.vercel.app"; // Ganti dengan URL deployment Next.js
const API_TOKEN = "";    // Isi jika API pakai bearer token

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("TaskFlow")
    .addItem("⬇️ Tarik dari DB (Pull)", "pullFromDB")
    .addItem("⬆️ Dorong ke DB (Push)", "pushToDB")
    .addToUi();
}

/**
 * Tarik data dari Sheet → Next.js API
 */
function pullFromDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Projects");
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet 'Projects' tidak ditemukan!");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Baris pertama header: id, name, description, status, startDate, endDate
  const rows = data.slice(1);

  const projects = rows.map(row => ({
    id: row[headers.indexOf("id")] || "",
    name: row[headers.indexOf("name")] || "",
    description: row[headers.indexOf("description")] || "",
    status: row[headers.indexOf("status")] || "active",
    startDate: formatDate(row[headers.indexOf("startDate")]),
    endDate: formatDate(row[headers.indexOf("endDate")]),
  }));

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ projects }),
    muteHttpExceptions: true,
  };

  if (API_TOKEN) options.headers = { Authorization: `Bearer ${API_TOKEN}` };

  try {
    const res = UrlFetchApp.fetch(`${API_BASE_URL}/api/sync/pull`, options);
    const result = JSON.parse(res.getContentText());
    SpreadsheetApp.getUi().alert(`Pull berhasil!\nInsert/update: ${result.upserted ?? result.count ?? "OK"}`);
  } catch (e) {
    SpreadsheetApp.getUi().alert(`Gagal pull: ${e.message}`);
  }
}

/**
 * Dorong data dari Next.js API → Sheet
 */
function pushToDB() {
  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
  };
  if (API_TOKEN) options.headers = { Authorization: `Bearer ${API_TOKEN}` };

  try {
    const res = UrlFetchApp.fetch(`${API_BASE_URL}/api/sync/push`, options);
    const result = JSON.parse(res.getContentText());

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tulis Projects
    let sheet = ss.getSheetByName("Projects");
    if (!sheet) sheet = ss.insertSheet("Projects");
    sheet.clear();
    sheet.appendRow(["id", "name", "description", "status", "startDate", "endDate"]);
    if (result.projects) {
      result.projects.forEach(p => sheet.appendRow([p.id, p.name, p.description, p.status, p.startDate, p.endDate]));
    }

    // Tulis Tasks jika ada
    if (result.tasks) {
      let tSheet = ss.getSheetByName("Tasks");
      if (!tSheet) tSheet = ss.insertSheet("Tasks");
      tSheet.clear();
      tSheet.appendRow(["id", "projectId", "title", "description", "status", "deadline"]);
      result.tasks.forEach(t => tSheet.appendRow([t.id, t.projectId, t.title, t.description, t.status, t.deadline]));
    }

    SpreadsheetApp.getUi().alert("Push berhasil! Sheet diperbarui.");
  } catch (e) {
    SpreadsheetApp.getUi().alert(`Gagal push: ${e.message}`);
  }
}

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
