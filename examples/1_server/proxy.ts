import {HTTPError, Route} from '../../src/index.js'

export const route = new Route()

// proxy for frontend
route.get('*', async ctx => {
	const input = new URL(ctx.pathname, 'http://0.0.0.0:50000')
	const res = await fetch(input, {})

	if (res.status >= 400) throw new HTTPError(res.status)

	for (const [key, val] of res.headers) { // delete http/1 header
		if (['connection', 'keep-alive'].includes(key)) continue
		ctx.header.set(key, val)
	}
	return await res.arrayBuffer()
})
