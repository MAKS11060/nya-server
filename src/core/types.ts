import {PathLike} from 'fs'
import http from 'http'
import http2 from 'http2'
import https from 'https'
import {Context} from './Context.js'

interface Config {
	log?: 'none' | 'error'
}

interface SSL {
	key?: PathLike
	cert?: PathLike
	ca?: PathLike
}

interface ConfigHTTP extends Config {
	http: 'http'
	options?: http.ServerOptions
}

interface ConfigHTTPS extends Config, SSL {
	http: 'https'
	options?: https.ServerOptions
}

interface ConfigH2 extends Config, SSL {
	http: 'h2'
	options?: Omit<http2.SecureServerOptions, 'settings' | 'allowHTTP1'>
	settings?: http2.Settings
}

export type AppConfig = ConfigH2 | ConfigHTTP | ConfigHTTPS

// HTTP Methods
export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'PATCH' | 'TRACE'

// Media Types
export enum ContentType {
	/* Application */
	json = 'application/json',
	urlencoded = 'application/x-www-form-urlencoded',

	/* Text */
	html = 'text/html; charset=utf-8',
	text = 'text/plain; charset=utf-8',
	css = 'text/css; charset=utf-8',
	js = 'text/javascript',
	md = 'text/markdown; charset=utf-8',

	/* Images */
	jpg = 'image/jpeg',
	gif = 'image/gif',
	png = 'image/png',
	svg = 'image/svg+xml',
	webp = 'image/webp',
	apng = 'image/apng',
	avif = 'image/avif',
	heic = 'image/heic',

	/* Multipart */
	formData = 'multipart/form-data',
	byteranges = 'multipart/byteranges',

	/* Stream */
	bin = 'application/octet-stream',
	eventStream = 'text/event-stream',
}

// Response Status
export enum StatusCode {
	'Continue' = 100,
	'Switching Protocols' = 101,
	'Early Hints' = 103,

	'OK' = 200,
	'Created' = 201,
	'Accepted' = 202,
	'Non-Authoritative Information' = 203,
	'No Content' = 204,
	'Reset Content' = 205,
	'Partial Content' = 206,

	'Multiple Choices' = 300,
	'Moved Permanently' = 301,
	'Found' = 302,
	'See Other' = 303,
	'Not Modified' = 304,
	'Temporary Redirect' = 307,
	'Permanent Redirect' = 308,

	'Bad Request' = 400,
	'Unauthorized' = 401,
	'Payment Required' = 402,
	'Forbidden' = 403,
	'Not Found' = 404,
	'Method Not Allowed' = 405,
	'Not Acceptable' = 406,
	'Proxy Authentication Required' = 407,
	'Request Timeout' = 408,
	'Conflict' = 409,
	'Gone' = 410,
	'Length Required' = 411,
	'Precondition Failed' = 412,
	'Payload Too Large' = 413,
	'URI Too Long' = 414,
	'Unsupported Media Type' = 415,
	'Range Not Satisfiable' = 416,
	'Expectation Failed' = 417,
	'I\'m a teapot' = 418,
	'Unprocessable Entity' = 422,
	'Too Early' = 425,
	'Upgrade Required' = 426,
	'Precondition Required' = 428,
	'Too Many Requests' = 429,
	'Request Header Fields Too Large' = 431,
	'Unavailable For Legal Reasons' = 451,

	'Internal Server Error' = 500,
	'Not Implemented' = 501,
	'Bad Gateway' = 502,
	'Service Unavailable' = 503,
	'Gateway Timeout' = 504,
	'HTTP Version Not Supported' = 505,
	'Variant Also Negotiates' = 506,
	'Insufficient Storage' = 507,
	'Loop Detected' = 508,
	'Not Extended' = 510,
	'Network Authentication Required' = 511
}

// Utils
export type Flatten<T> = T extends any[] ? T[number] : T

// Route
type ParseRouteParams<R> = R extends `${string}/:${infer P}/${infer Rest}`
	? P | ParseRouteParams<`/${Rest}`>
	: R extends `${string}/:${infer P}`
		? P
		: never

export type RouteParams<R extends string> = Record<ParseRouteParams<R>, string>

export type RouteMethod = HTTPMethod | HTTPMethod[]

export interface RouteHandler<P extends RouteParams<string>, M extends RouteMethod> {
	(ctx: Context<Flatten<M>, P>): unknown | Promise<unknown>
}

export interface MiddlewareHandler {
	(ctx: Context<Flatten<RouteMethod>, RouteParams<string>>): unknown | Promise<unknown>
}

export type Status = keyof typeof StatusCode
