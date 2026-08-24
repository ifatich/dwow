import { NextRequest, NextResponse } from "next/server";

/**
 * Response helper untuk konsistensi format error & sukses.
 */

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(resource: string, id?: string) {
  return NextResponse.json(
    { error: `${resource} tidak ditemukan`, ...(id ? { id } : {}) },
    { status: 404 }
  );
}

export function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function unprocessable(message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status: 422 }
  );
}

export function serverError(message = "Terjadi kesalahan server") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function success(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Validator helpers
 */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
      return `${field} wajib diisi`;
    }
  }
  return null;
}

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrapper untuk handler API — tangkap error dan return 500.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      console.error("API Error:", error);
      return serverError();
    }
  };
}
