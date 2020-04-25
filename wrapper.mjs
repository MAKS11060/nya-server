import cjsModule from './index.js'

export default cjsModule

export const name = 'nya-server'

export const http = cjsModule.http
export const https = cjsModule.https
export const wss = cjsModule.wss
export const ws = cjsModule.ws

export const use = cjsModule.use
export const all = cjsModule.all
export const get = cjsModule.get
export const head = cjsModule.head
export const post = cjsModule.post
export const put = cjsModule.put
export const del = cjsModule.del
export const options = cjsModule.options

export const setSSL = cjsModule.setSSL
export const setCert = cjsModule.setCert
export const setCerts = cjsModule.setCerts

export const push = cjsModule.push
export const router = cjsModule.router
export const find = cjsModule.find
export const useRoutes = cjsModule.useRoutes

export const createApp = cjsModule.createApp
