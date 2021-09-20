import {Context} from './context.js'


export type Middleware = (ctx: Context) => void

export class Handler {
	private stack: (Middleware)[] = []

	static create() {
		return new this()
	}

	add(handler: Middleware) {
		this.stack.push(handler)
	}

	async run(context: Context) {
		for (let handler of this.stack) {
			await handler(context)
		}
	}
}
