'use strict'

const qs = require('querystring')
const bytes = require('bytes')

const isEmpty = method => ['GET', 'HEAD', 'OPTIONS'].includes(method)
const pretter = ({headers: {'content-type': type}}) => {
	if (/text\/plain/.test(type)) {
		return data => {
			try {
				return data.toString()
			} catch (e) {
				throw e
			}
		}
	}

	if (/application\/json/.test(type)) {
		return data => {
			try {
				return JSON.parse(data)
			} catch (e) {
				throw e
			}
		}
	}

	if (/application\/x-www-form-urlencoded/.test(type)) {
		return data => {
			try {
				return qs.parse(data.toString())
			} catch (e) {
				throw e
			}
		}
	}

	return data => data
}

module.exports = props => {
	const PAYLOAD = bytes(props.payload ? props.payload : '4mb')

	return ctx => {
		const { method, headers: {
			'content-length': size = 0,
			'content-type': type,
		}, stream, socket } = ctx
		
		const body = new Promise((resolve, reject) => {
			if (isEmpty(method)) resolve(null)
			else {
				const buf = []
				let cSize = 0
				let isResolve = false
				const data = chunk => {
					cSize += chunk.byteLength
					if (limit.payload < cSize) {
						reject(new Error(`Payload Limit: ${bytes(PAYLOAD)}`))
					} else buf.push(chunk)
					
					if (+size === cSize) {
						if (isResolve) return
						else isResolve = true
						resolve(Buffer.concat(buf))
					}
				}
				
				const end = () => {
					if (+size === cSize) {
						if (isResolve) return
						else isResolve = true
						resolve(Buffer.concat(buf))
					}
				}
				
				if (ctx.req.httpVersionMajor === 2) {
					stream.on('end', end)
					stream.on('data', data)
					stream.on('error', reject)
				} else {
					ctx.req.on('end', end)
					ctx.req.on('data', data)
					ctx.req.on('error', reject)
				}
			}
		})
		.then(data => {
			if (data) return pretter(ctx)(data)
			else return null
		})
		
		Object.defineProperties(ctx, {
			body: {enumerable: true, writable: false, configurable: false, value: body},
		})
		
	}
}
