import {setTimeout} from 'node:timers/promises'

async function* Events() {
  while (true) {
    yield ServerEventSource.createEvent({
      id: 1,
      event: 'ping',
      data: JSON.stringify({
        time: await setTimeout(5000, Date.now()),
      }, null, 2),
    })
  }
}

const sse = Events()


export class ServerEventSource extends Response {
  static createEvent(e: {
    data: any
    event?: string
    id?: string | number
    retry?: number
  }): string {
    let res = ''
    if (e.id) res += `id: ${e.id}\n`
    if (e.event) res += `event: ${e.event}\n`
    if (e.retry) res += `retry: ${e.retry}\n`
    if (e.data) {
      e.data = String(e.data)
      for (let s of e.data.split('\n')) res += `data: ${s}\n`
    }

    return res + '\n\n'
  }

  constructor() {
    const s = new ReadableStream({
      start(controller) {},
      pull: async controller => {
        for await (const e of sse) {
          console.log(e)
          controller.enqueue(e)
        }
      },
    })

    super(s, {
      headers: {
        'content-type': 'text/event-stream',
      },
    })
  }
}
