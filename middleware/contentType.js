'use strict'

const mime = require('mime')

module.exports = ctx => {
	const type = ContentType => {
		if (typeof ContentType === 'string') {
			switch (ContentType.toLowerCase()) {
				case 'json':
				case 'application/json':
					ctx.header['content-type'] = 'application/json';break
	
				case 'html':
				case 'text/html':
					ctx.header['content-type'] = 'text/html';break
	
				case 'css':
				case 'sass':
				case 'scss':
				case 'text/css':
					ctx.header['content-type'] = 'text/css';break
	
				case 'js':
				case 'javascript':
				case 'application/javascript':
					ctx.header['content-type'] = 'application/javascript';break
	
				case 'txt':
				case 'text':
				case 'text/plain':
					ctx.header['content-type'] = 'text/plain';break
	
				case 'event':
				case 'events':
				case 'event-stream':
					ctx.header['content-type'] = 'text/event-stream';break
				
				default: ctx.header['content-type'] = mime.getType(ContentType)
			}
		} else {
			throw TypeError('Content-Type is not a string')
		}
	}

	Object.defineProperty(ctx, 'type', {
		enumerable: true, configurable: false, writable: false, value: type
	})
}