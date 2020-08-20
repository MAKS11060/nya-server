import {Router} from '../../../index.js'

export const router = Router()

router.get('/', ctx => {
	ctx.html = `hello`
})

router.get('/profile/:name', ctx => {
	ctx.json = {
		user: {
			name: ctx.params.name
		}
	}
})

router.get('/cookies', ctx => {
	const payload = {
		browserCookies: ctx.cookies
	}
	//ctx.cookie.clear('test', 'text')
	//ctx.cookie.clear('test')
	//ctx.cookie.clear()
	
	ctx.html = `<pre>${JSON.stringify(payload, null, 2)}</pre>`
})

router.get('/cookies/set/:name/:val', ctx => {

	ctx.cookie.set(
		ctx.params.name,
		ctx.params.val,
		{
			maxAge: 360,
			path: '/cookies'
		}
	)
	
	ctx.header.location = '/cookies'
	ctx.status = 307
	ctx.send()
})
