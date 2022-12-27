import {nodeHMR} from '@maks11060/vite-plugin-node-hmr'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [nodeHMR()],
})
