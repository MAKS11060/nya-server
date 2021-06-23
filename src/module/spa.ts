import path from 'path'
import {promises as fs} from 'fs'

type Options = {
	index: string
	root?: string
}

export const CreateSPA = (opts: Options = {index: 'dist/index.html'}): (pathname: string) => Promise<{data: Buffer, type: string} | {error: any}> => {
	const rootFile = path.relative(path.dirname(path.resolve(opts.index)), path.resolve(opts.index))
	const rootDir = path.resolve(opts.root || path.dirname(opts.index))

	return async pathname => {
		try {
			if (pathname === '/' || !path.extname(pathname)) pathname = rootFile

			if (path.extname(pathname)) {
				const filepath = path.join(rootDir, pathname)
				await fs.access(filepath)
				return {
					data: await fs.readFile(filepath),
					type: filepath
				}
			}

		} catch (e) {
			return {
				error: e
			}
		}
	}
}
