/**
 * Heimdall SDK exception hierarchy.
 *
 * Mirrors `sdks/python/heimdall/errors.py`. Every HTTP failure path raises a
 * `HeimdallError` or one of its subclasses; transport failures (DNS, refused
 * connections, aborted requests) raise `NetworkError`.
 */

export class HeimdallError extends Error {
  public readonly statusCode?: number;
  public readonly body?: unknown;

  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message);
    this.name = "HeimdallError";
    this.statusCode = statusCode;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends HeimdallError {
  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message, statusCode, body);
    this.name = "AuthenticationError";
  }
}

export class InvalidPayloadError extends HeimdallError {
  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message, statusCode, body);
    this.name = "InvalidPayloadError";
  }
}

export class NotFoundError extends HeimdallError {
  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message, statusCode, body);
    this.name = "NotFoundError";
  }
}

export class NetworkError extends HeimdallError {
  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message, statusCode, body);
    this.name = "NetworkError";
  }
}
