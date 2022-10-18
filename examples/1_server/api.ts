import {randomInt} from 'node:crypto'
import {HTTPError, Route} from '../../src/index.js'

export const route = new Route()

route.get('/', ctx => {
	ctx.html(`<a href="/posts">Posts</a>`)
})

route.get('/posts', ctx => {
	ctx.html(`
		<a href="/">Index</a><br>
		<a href="/post/1">Post 1</a><br>
		<a href="/post/random">Post random</a>`)
})

route.get('/post/random', ctx => {
	return `/post - ${randomInt(10, 100)}`
})

route.get('/post/:id', ctx => {
	return `/post - ${ctx.params.id}`
})

route.post('/api/post/text', async ctx => {
	return ctx.body.text(100)
})

route.post('/api/post/json', async ctx => {
	const body = await ctx.body.json<{ id: number }>()
	if (body && body.id) {
		console.log('post', body)
		ctx.status('Created')
		return body
	}

	throw new HTTPError('Bad Request')
})
