import {IContext} from './context.js'


export type Middleware = (ctx: IContext) => void

export class Handler {
	private stack: (Middleware)[] = []

	static create() {
		return new this()
	}

	add(handler: Middleware) {
		this.stack.push(handler)
	}

	async run(context: IContext) {
		for (let handler of this.stack) {
			await handler(context)
		}
	}
}
