import {Status, StatusCode} from './types.js'

export class HTTPError extends Error {
	statusCode: number = 500

	constructor(code: Status | number, message?: string | object, pretty?: boolean) {
		if (typeof message == 'object') message = JSON.stringify(message, null, pretty ? '2' : undefined)
		if (typeof code == 'string' && StatusCode[code]) {
			super(message || code || 'Unknown')
			this.statusCode = StatusCode[code]
		} else if (typeof code === 'number') {
			super(message || StatusCode[code] || 'Unknown')
			this.statusCode = code
		}
	}
}
