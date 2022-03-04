import {readdir} from 'fs/promises'
import path from 'path'
import {watch, WatchEventType, WatchListener} from 'fs'
import {wait} from './time.js'

export class Files {
	static async* readDir(dir: string): AsyncGenerator<string, any, string> {
		for (const dirent of await readdir(dir, {withFileTypes: true})) {
			if (dirent.isFile()) yield path.join(dir, dirent.name)
			if (dirent.isDirectory()) yield* Files.readDir(path.join(dir, dirent.name))
		}
	}

	static watchFolder(dir: string, delay: number, watchListener: WatchListener<string>) {
		const fsWatcher = watch(dir, {recursive: true})
		const setWatchListener = () => {
			new Promise(resolve => {
				fsWatcher.once('change', async (eventType: WatchEventType, filename: string) => {
					await watchListener(eventType, filename)
					resolve(true)
				})
			}).then(() => wait(delay)).then(() => setWatchListener())
		}
		setWatchListener()
	}
}