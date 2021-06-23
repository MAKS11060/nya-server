# Nya-server

Minimalist REST server

## Installation

```bash
$ pnpm install nya-server
```
or
```bash
$ npm install nya-server
```

## Usage

Entry point
```js
//index.js
import {App} from 'nya-server'
import server from './server.js'
import {app as router} from './app.js'

const app = App.create()

app.useServer(server)
app.use(router)
```

```js
//server.js
import {Server} from 'nya-server'
import path from 'path'
import fs from 'fs'
import os from 'os'

const PORT = 50000 || process.env.PORT

export const server = Server.createHTTP()
// OR 
export const server = Server.createHTTP2({
  key: fs.readFileSync(path.join(os.homedir(), '.certs', process.env.PATH_KEY)),
  cert: fs.readFileSync(path.join(os.homedir(), '.certs', process.env.PATH_CERT))
})

server.listen(PORT)
```

```js
//app.js
import {Router} from 'nya-server'

export const app = Router.create()

app.use(ctx => {
	console.log(`${ctx.method} ${ctx.pathname}`)
})

app.get('/', ctx => {
	ctx.html('<h2>Hello, World!</h2>')
})

app.all('/test', ctx => {
	ctx.json(ctx.headers, null, 2)
})

const posts = new Map
app.post('/post', async ctx => {
	const {id, data} = await ctx.body.json()
	posts.set(id, data)
	ctx.send(`Post #${id} created: \n${data}`)
})

app.get('/post/:id', ctx => {
	if (posts.has(ctx.params.id))
		ctx.send(`${ctx.params.id} | ${posts.get(ctx.params.id)}`)
	else
		ctx.status(404).send('Post not found')
})
```

## License 

[MIT](LICENSE)
