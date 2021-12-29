import http from 'http'

export type SocketInfo = {
	remoteFamily: string
	remoteAddress: string
	remotePort: number
	localAddress: string
	localPort: number
}

export type ContentType = string
	| 'text/plain'
	| 'text/html'
	| 'text/css'
	| 'text/javascript'
	| 'text/event-stream'
	| 'application/json'
	| 'application/javascript'
	| 'application/x-www-form-urlencoded'
	| 'application/octet-stream'
	| 'image/jpeg'
	| 'image/png'
	| 'image/gif'
	| 'image/svg+xml'
	| 'image/webp'
	| 'image/avif'
	| 'audio/wave'
	| 'audio/wav'
	| 'audio/webm'
	| `audio/mpeg`
	| `audio/vorbis`
	| `audio/ogg`
	| 'video/webm'
	| 'video/mp4'
	| 'font/woff'
	| 'font/ttf'
	| 'font/otf'
	| 'multipart/form-data'

type CustomContentType = {
	':status': number
	'content-type': ContentType
}

export type Header<T = http.IncomingHttpHeaders> =
	http.OutgoingHttpHeaders
	| { [key in keyof T]: string } & CustomContentType
