import {ErrorStatus, isClientErrorStatus, isErrorStatus, Status} from './httpStatus.js'

const ERROR_STATUS_MAP = {
  'BadRequest': 400,
  'Unauthorized': 401,
  'PaymentRequired': 402,
  'Forbidden': 403,
  'NotFound': 404,
  'MethodNotAllowed': 405,
  'NotAcceptable': 406,
  'ProxyAuthRequired': 407,
  'RequestTimeout': 408,
  'Conflict': 409,
  'Gone': 410,
  'LengthRequired': 411,
  'PreconditionFailed': 412,
  'RequestEntityTooLarge': 413,
  'RequestURITooLong': 414,
  'UnsupportedMediaType': 415,
  'RequestedRangeNotSatisfiable': 416,
  'ExpectationFailed': 417,
  'Teapot': 418,
  'MisdirectedRequest': 421,
  'UnprocessableEntity': 422,
  'Locked': 423,
  'FailedDependency': 424,
  'UpgradeRequired': 426,
  'PreconditionRequired': 428,
  'TooManyRequests': 429,
  'RequestHeaderFieldsTooLarge': 431,
  'UnavailableForLegalReasons': 451,
  'InternalServerError': 500,
  'NotImplemented': 501,
  'BadGateway': 502,
  'ServiceUnavailable': 503,
  'GatewayTimeout': 504,
  'HTTPVersionNotSupported': 505,
  'VariantAlsoNegotiates': 506,
  'InsufficientStorage': 507,
  'LoopDetected': 508,
  'NotExtended': 510,
  'NetworkAuthenticationRequired': 511,
} as const

export type ErrorStatusKeys = keyof typeof ERROR_STATUS_MAP;

export type HttpErrorInit = ErrorStatusKeys | string

export interface HttpErrorOptions extends ErrorOptions {
  expose?: boolean
  headers?: HeadersInit
  status?: number
  description?: string
}

export class HttpError extends Error {
  #status: ErrorStatus = Status.InternalServerError
  #expose: boolean
  #headers?: Headers
  #description?: string

  constructor(message: HttpErrorInit = 'InternalServerError', options?: HttpErrorOptions) {
    super(message, options)

    if (options) {
      if (options.status) {
        this.#status = options.status
      }

      this.#description = options?.description
    }

    if (ERROR_STATUS_MAP[message as ErrorStatusKeys]) {
      this.#status = ERROR_STATUS_MAP[message as ErrorStatusKeys]
    }

    this.#expose = options?.expose === undefined
      ? isClientErrorStatus(this.status)
      : options.expose

    if (options?.headers) {
      this.#headers = new Headers(options.headers)
    }
  }

  /** A flag to indicate if the internals of the error, like the stack, should
   * be exposed to a client, or if they are "private" and should not be leaked.
   * By default, all client errors are `true` and all server errors are
   * `false`. */
  get expose(): boolean {
    return this.#expose
  }

  /** The optional headers object that is set on the error. */
  get headers(): Headers | undefined {
    return this.#headers
  }

  /** The error status that is set on the error. */
  get status(): ErrorStatus {
    return this.#status
  }

  get description() {
    return this.#description
  }
}

/** A type guard that determines if the value is an HttpError or not. */
export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError
}
