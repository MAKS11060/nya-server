export const wait = <T>(ms: number, args?: T): PromiseLike<T> => new Promise(r => setTimeout(r, ms, args))
