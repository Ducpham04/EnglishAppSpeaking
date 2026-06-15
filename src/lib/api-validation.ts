import { NextResponse } from 'next/server';
import { z } from 'zod';

export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

export function validationErrorResponse(error: z.ZodError) {
  return NextResponse.json(
    {
      error: 'Dữ liệu gửi lên chưa hợp lệ.',
      code: 'VALIDATION_ERROR',
      issues: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Request body phải là JSON hợp lệ.',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: validationErrorResponse(parsed.error),
    };
  }

  return {
    ok: true as const,
    data: parsed.data,
  };
}
