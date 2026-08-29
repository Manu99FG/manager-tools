import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

export const ADMIN_COOKIE_NAME =
  "manager_tools_admin";

const SESSION_DURATION_SECONDS =
  60 * 60 * 24 * 7;

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    ""
  );
}

function encodeSignature(
  value: string
) {
  const secret =
    getSessionSecret();

  if (!secret) {
    throw new Error(
      "Falta ADMIN_SESSION_SECRET en las variables de entorno."
    );
  }

  return createHmac(
    "sha256",
    secret
  )
    .update(value)
    .digest("base64url");
}

function safeEqual(
  left: string,
  right: string
) {
  const leftBuffer =
    Buffer.from(left);

  const rightBuffer =
    Buffer.from(right);

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

export function isValidAdminPassword(
  value: string
) {
  const expected =
    process.env.ADMIN_PHOTO_PASSWORD ??
    "";

  if (!expected) {
    throw new Error(
      "Falta ADMIN_PHOTO_PASSWORD en las variables de entorno."
    );
  }

  return safeEqual(
    value,
    expected
  );
}

export function createAdminSessionToken() {
  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SESSION_DURATION_SECONDS;

  const payload =
    `v1.${expiresAt}`;

  const signature =
    encodeSignature(payload);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token?: string | null
) {
  if (!token) {
    return false;
  }

  const secret =
    getSessionSecret();

  if (!secret) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [
    version,
    expiresAtRaw,
    signature,
  ] = parts;

  if (version !== "v1") {
    return false;
  }

  const expiresAt =
    Number(expiresAtRaw);

  if (
    !Number.isInteger(
      expiresAt
    ) ||
    expiresAt <=
      Math.floor(
        Date.now() / 1000
      )
  ) {
    return false;
  }

  const payload =
    `${version}.${expiresAtRaw}`;

  const expectedSignature =
    encodeSignature(payload);

  return safeEqual(
    signature,
    expectedSignature
  );
}

export async function isAdminSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      ADMIN_COOKIE_NAME
    )?.value;

  return verifyAdminSessionToken(
    token
  );
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV ===
    "production",
  path: "/",
  maxAge:
    SESSION_DURATION_SECONDS,
};
