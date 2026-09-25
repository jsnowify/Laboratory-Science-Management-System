import { APIError } from "better-auth/api";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function applicationError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof APIError) {
    const code =
      typeof error.body === "object" &&
      error.body !== null &&
      "code" in error.body
        ? String(error.body.code)
        : "";
    if (
      code === "USER_ALREADY_EXISTS" ||
      code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
    )
      return new AppError(
        409,
        "EMAIL_EXISTS",
        "That email address is already registered.",
      );
    if (code === "INVALID_EMAIL")
      return new AppError(422, "INVALID_EMAIL", "Enter a valid email address.");
    if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG")
      return new AppError(
        422,
        "INVALID_PASSWORD",
        "Choose a password that meets the stated requirements.",
      );
  }
  return databaseError(error);
}

export function databaseError(error: unknown): AppError {
  let failure = error;
  for (let depth = 0; depth < 4; depth++) {
    if (
      typeof failure !== "object" ||
      failure === null ||
      !("cause" in failure) ||
      !failure.cause
    )
      break;
    failure = failure.cause;
  }
  const code =
    typeof failure === "object" && failure !== null && "code" in failure
      ? String(failure.code)
      : "";
  const constraint =
    typeof failure === "object" &&
    failure !== null &&
    "constraint_name" in failure
      ? String(failure.constraint_name)
      : "";
  if (code === "23505") {
    if (constraint === "users_institutional_id_key")
      return new AppError(
        409,
        "INSTITUTIONAL_ID_EXISTS",
        "That institutional ID is already registered.",
      );
    if (
      constraint === "users_email_key" ||
      constraint === "auth_users_email_key" ||
      constraint === "auth_users_email_unique"
    )
      return new AppError(
        409,
        "EMAIL_EXISTS",
        "That email address is already registered.",
      );
    return new AppError(409, "CONFLICT", "This record already exists.");
  }
  if (code === "23P01")
    return new AppError(
      409,
      "ALLOCATION_CONFLICT",
      "This equipment is already reserved for an overlapping schedule.",
    );
  if (code === "23503")
    return new AppError(
      409,
      "RECORD_IN_USE",
      "This record cannot be removed because it is currently being used.",
    );
  return new AppError(
    500,
    "DATABASE_ERROR",
    "The request could not be completed.",
  );
}
