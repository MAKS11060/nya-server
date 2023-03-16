import {App} from '@maks11060/nya-server'

const app = new App({compress: {enabled: true}})
app.listenH2C({port: 50001})

app.router.use(async (ctx, done) => {
  let ts = performance.now()
  await done()
  ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
})

app.router.get('/api', async ctx => {
  const h = `<!doctype html>
  <html lang="en">
  <head>
     <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">
<!--     <meta name="color-scheme" content="dark light">-->
     <link rel="stylesheet" href="api/index.css">
     <link rel="stylesheet" href="api/test.css">
  </head>
  </html>`
  ctx.type('text/html; charset=utf-8')
  ctx.respond(h)
})
app.router.get('/api/index.css', async ctx => {
  const h = `
  html {
    color-scheme: dark;
  }
  `

  ctx.type('text/css')
  ctx.respond(h)
})
app.router.get('/api/test.css', async ctx => {
  const h = `
  html, body {
    margin: 0;
  }
  `

  ctx.type('text/css')
  ctx.respond(h)
})
app.router.post('/api/post/:type', async ctx => {
  console.log(ctx.urlPattern)
  ctx.respond(await ctx.body.text())
})

app.router.get('/api/1', ctx => {
  ctx.text('123')
})

/*app.router.get('/api', async ctx => {
  const h = `<!doctype html>
  <html lang="en">
  <head>
     <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">
     <meta name="color-scheme" content="dark light">
     <link rel="stylesheet" href="./api/index.css" >
     <script type="importmap">
      {
        "imports": {
          "app": "./api/app.js",
          "pkg": "./api/pkg.js"
        }
      }
    </script>
     <script type="module">
        import 'app'
    </script>
  </head>
  <body>
    <form action="/api/login" method="post" enctype="application/x-www-form-urlencoded">
      <input type="text" name="login">
      <input type="text" name="password">
      <button type="submit">login</button>
    </form>
  </body>
  </html>`
  ctx.type('text/html; charset=utf-8')
  // if (ctx.etag(genEtag(h))) return ctx.redirect('', 304)
  if (!ctx.cookie['sid']) ctx.cookies.set({
    name: 'sid', value: randomUUID(), secure: true, httpOnly: true, sameSite: 'Lax',
  })
  await ctx.respond(h, {compress: true})
})

app.router.get('/api/app.js', ctx => {
  ctx.type('text/javascript')
  ctx.respond(`
    import {version} from 'pkg'
    console.log(version)
  `)
})
app.router.get('/api/pkg.js', ctx => {
  ctx.type('text/javascript')
  ctx.respond(`
    export const version = '${pkg.version}'
  `)
})
app.router.get('/api/index.css', ctx => {
  ctx.type('text/css')
  ctx.respond(`
  form {
    display: flex;

  }
  `)
})

app.router.post('/api/login', async ctx => {
  const body = await ctx.body.queryString() as {
    login: string
    password: string
  }
  console.log(body)
  ctx.redirect('/api')
})*/
