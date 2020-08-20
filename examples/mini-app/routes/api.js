import {Router} from '../../../index.js'

export const router = Router()
const devApi = Router()

router.routes('/dev', devApi)

router.use(ctx => {})
router.get('/posts', ctx => {})
router.post('/post', ctx => {})
router.post('/post/:id', ctx => {})

devApi.get('/', ctx => {})
