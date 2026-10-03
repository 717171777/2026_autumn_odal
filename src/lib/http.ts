import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function guardOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let originUrl: URL | undefined;
  try {
    if (origin) originUrl = new URL(origin);
  } catch {
    /* Invalid origins are rejected below. */
  }
  if (
    !originUrl ||
    originUrl.host !== request.headers.get("host") ||
    !["http:", "https:"].includes(originUrl.protocol)
  )
    throw new ApiError(403, "허용되지 않은 요청입니다.");
  if (
    request.headers.get("content-length") &&
    Number(request.headers.get("content-length")) > 65536
  )
    throw new ApiError(413, "입력 내용이 너무 큽니다.");
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 65536) throw new ApiError(413, "입력 내용이 너무 큽니다.");
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new ApiError(400, "입력 형식을 확인해주세요.");
    return body;
  } catch {
    throw new ApiError(400, "입력 형식을 확인해주세요.");
  }
}
export function endpoint(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          {
            error: "입력 내용을 확인해주세요.",
            fields: error.flatten().fieldErrors,
          },
          400,
        );
      if ((error as { code?: string }).code === "23505")
        return json({ error: "이미 사용 중인 이메일입니다." }, 409);
      console.error(
        "Request failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return json(
        { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." },
        503,
      );
    }
  };
}
