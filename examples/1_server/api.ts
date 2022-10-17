import {randomInt} from 'node:crypto'
import {Route} from '../../src/index.js'

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
