import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

/**
 * GET /api/master/categories
 * Mengambil daftar master kategori project beserta data Lead-nya dan daftar personil yang bisa dipilih sebagai Lead.
 */
export async function GET() {
  try {
    const categories = sqlite.prepare(`
      SELECT 
        pc.id,
        pc.name,
        pc.code,
        pc.lead_id,
        pc.description,
        pc.is_active,
        pc.created_at,
        pc.updated_at,
        u.nama as lead_nama,
        u.username as lead_username,
        u.role as lead_role,
        (SELECT COUNT(*) FROM projects p WHERE p.title = pc.name) as total_projects,
        (SELECT COUNT(*) FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.title = pc.name) as total_tasks
      FROM project_categories pc
      LEFT JOIN users u ON pc.lead_id = u.id
      ORDER BY pc.name ASC
    `).all();

    // Daftar lead valid (hanya role = 'lead', takeout admin/kadep/kadiv)
    const availableLeads = sqlite.prepare(`
      SELECT id, nama, username, role, department
      FROM users
      WHERE role = 'lead'
      ORDER BY nama ASC
    `).all();

    return NextResponse.json({
      categories,
      availableLeads,
    });
  } catch (err: any) {
    console.error("GET /api/master/categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/master/categories
 * Menambahkan master kategori baru.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, lead_id, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanCode = (code && typeof code === "string" && code.trim())
      ? code.trim().toUpperCase()
      : cleanName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PROJ";

    // Cek duplikasi nama
    const existing = sqlite.prepare("SELECT id FROM project_categories WHERE LOWER(name) = LOWER(?)").get(cleanName);
    if (existing) {
      return NextResponse.json({ error: `Kategori "${cleanName}" sudah terdaftar` }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO project_categories (id, name, code, lead_id, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, cleanName, cleanCode, lead_id || null, description || null, now, now);

    return NextResponse.json({
      success: true,
      category: {
        id,
        name: cleanName,
        code: cleanCode,
        lead_id: lead_id || null,
        description: description || null,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/master/categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/master/categories
 * Mengubah data kategori (nama, kode, lead_id, deskripsi, status aktif)
 * Parameter opsional: syncExisting (boolean) - jika true, update project & task aktif yang terkait.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, code, lead_id, description, is_active, syncExisting = true } = body;

    if (!id) {
      return NextResponse.json({ error: "ID kategori wajib diisi" }, { status: 400 });
    }

    const current = sqlite.prepare("SELECT * FROM project_categories WHERE id = ?").get(id) as any;
    if (!current) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const cleanName = name !== undefined ? name.trim() : current.name;
    const cleanCode = code !== undefined ? code.trim().toUpperCase() : current.code;
    const newLeadId = lead_id !== undefined ? (lead_id || null) : current.lead_id;
    const newDescription = description !== undefined ? description : current.description;
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;
    const now = new Date().toISOString();

    // Jalankan dalam transaksi
    const updateTx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE project_categories
        SET name = ?, code = ?, lead_id = ?, description = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(cleanName, cleanCode, newLeadId, newDescription, newIsActive, now, id);

      // Jika sinkronisasi ke project & task aktif diaktifkan dan lead diubah
      if (syncExisting && newLeadId !== undefined && newLeadId !== current.lead_id) {
        // Update project dengan title sesuai category name
        sqlite.prepare(`
          UPDATE projects
          SET lead_id = ?, updated_at = ?
          WHERE title = ?
        `).run(newLeadId, now, current.name);

        // Update task di bawah project tersebut
        sqlite.prepare(`
          UPDATE tasks
          SET lead_id = ?, updated_at = ?
          WHERE project_id IN (SELECT id FROM projects WHERE title = ?)
        `).run(newLeadId, now, current.name);
      }
    });

    updateTx();

    return NextResponse.json({
      success: true,
      message: "Data kategori berhasil diperbarui",
    });
  } catch (err: any) {
    console.error("PATCH /api/master/categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
