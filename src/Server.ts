import {createServer, IncomingMessage, ServerResponse} from 'http'

class Response {
  constructor(readonly body: any) {
  }
}

class ServerRequest {
  constructor(readonly req: IncomingMessage, readonly res: ServerResponse) {
  }

  respondWith(response: Response) {
    this.res.write(response.body)
    this.res.end(null)
  }
}

export class Server {
  #server = createServer()
  #stack: any[] = []

  listen(port: number) {
    this.#server.listen(port)
    this.#server.on('request', (req, res) => {
      const request = new ServerRequest(req, res)
      request.respondWith(new Response('123'))
    })
  }
}
