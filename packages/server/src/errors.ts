export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function badRequest(code: string, message: string): never {
  throw new ApplicationError(code, message, 400);
}

export function unauthorized(message = "Authentication required"): never {
  throw new ApplicationError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "You do not have permission to perform this action"): never {
  throw new ApplicationError("FORBIDDEN", message, 403);
}

export function notFound(entity: string): never {
  throw new ApplicationError("NOT_FOUND", `${entity} not found`, 404);
}
