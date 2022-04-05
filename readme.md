# Nya-server

REST HTTP/2 server 
- Typescript
- No req, res
- Full async support
- Support WebSocket on h2 (only)
- May not work in commonsJS

## Installation

```bash
$ pnpm install @maks11060/nya-server
or
$ npm install @maks11060/nya-server
```

## Usage

Entry point:
```ts
// server.ts
import {App, Server} from '@maks11060/nya-server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const {app, router} = new App()

// Server.HTTP(app).listen(80)
Server.HTTP2(app, {
  // key: fs.readFileSync(path.join(os.homedir(), '.certs', process.env.PATH_KEY)),
  // cert: fs.readFileSync(path.join(os.homedir(), '.certs', process.env.PATH_CERT)),
}).listen(443)

router.useImport(import('./router.js'))
```

```ts
// router.ts
import {Router} from '@maks11060/nya-server'

export const router = new Router()

router.get('/info', ctx => {
  // ctx.send(JSON.stringify({}, null, 2))
  ctx.json({
    method: ctx.method,
    uri: ctx.uri.toString(),
    headers: ctx.headers,
  }, null, 2)
})

const posts = []
router.post('/post', async ctx => {
  try {
    const post = await ctx.body.json()
    posts.push(post)
  } catch (e) {
    ctx.send('Invalid data')
  }
})
router.get('/post/:id', ctx => {
  const id = +ctx.params.id
  ctx.json({
    post: posts[id] || null,
    total: posts.length
  })
})

router.post('/upload', ctx => {
  ctx.body.size = 1024 * 512 // byte
  return ctx.body.formData().then(data => {
    console.log(data.files, data.fields)
    ctx.send('upload ok')
  }, reason => {
    console.log(reason)
    ctx.send('upload err')
  })
})
```

## License 

[MIT](LICENSE)
