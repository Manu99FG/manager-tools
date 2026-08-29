import {
  NextResponse,
} from "next/server";

import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSessionToken,
  isValidAdminPassword,
} from "@/lib/admin-auth";

export const runtime =
  "nodejs";

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const password =
      String(
        formData.get(
          "password"
        ) ?? ""
      );

    if (
      !isValidAdminPassword(
        password
      )
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin?error=1",
          request.url
        ),
        303
      );
    }

    const response =
      NextResponse.redirect(
        new URL(
          "/admin",
          request.url
        ),
        303
      );

    response.cookies.set(
      ADMIN_COOKIE_NAME,
      createAdminSessionToken(),
      adminCookieOptions
    );

    return response;
  } catch (error) {
    console.error(
      "Error iniciando sesión de administrador:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/admin?error=config",
        request.url
      ),
      303
    );
  }
}
