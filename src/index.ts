import {Server} from './Server.js'

console.clear()

const s = new Server()
s.listen(80)


/*
const api = Route({
  v1: {
    auth: {
      signin: {
        POST: request => 'signin',
      },
      signup: {
        POST: request => 'signup',
      },
      logout: {
        GET: request => 'logout',
        POST: request => 'logout',
      },
      refresh: {
        GET: request => 'refresh'
      }
    },
  },
})
const route = Route({
  api
})

const router = new Router(route)
console.log(router.getMap())
*/

/*/!* ANY *!/
type MediaType<Events extends { kind: string }> = {
  [E in Events as E['kind']]: E
}


type Movie = { kind: 'movie', year: number }
type Series = { kind: 'series', year: number }
type Anime = { kind: 'anime', year: number, title: string }

type Media = MediaType<Movie | Series | Anime>

class MediaStore {
  find() {
  }
}

const m: Media = {}*/

