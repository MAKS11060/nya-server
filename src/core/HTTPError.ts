import {Status, StatusCode} from './types.js'

export class HTTPError extends Error {
	statusCode: number = 500

	constructor(code: Status | number, message?: string) {
		if (typeof code == 'string' && StatusCode[code]) {
			super(message || code || 'Unknown')
			this.statusCode = StatusCode[code]
		} else if (typeof code === 'number') {
			super(message || StatusCode[code] || 'Unknown')
			this.statusCode = code
		}
	}
}
