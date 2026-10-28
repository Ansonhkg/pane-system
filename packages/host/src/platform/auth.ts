import { PATHS } from "../core/paths";
export function sessionCookieName(origin: string) {
  return PATHS.sessionCookie + "-" + new URL(origin).port;
}
export function sessionAllowed(
  request: Request,
  origin: string,
  token: string,
) {
  const cookies = request.headers.get("cookie") ?? "";
  const session = cookies
    .split(";")
    .some((c) => c.trim() === sessionCookieName(origin) + "=" + token);
  const originHeader = request.headers.get("origin");
  return (
    (originHeader === origin && session) ||
    (originHeader === null &&
      request.headers.get("authorization") === "Bearer " + token)
  );
}
