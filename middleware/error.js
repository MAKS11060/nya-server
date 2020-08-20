export default ctx => {
	ctx.error = (status, msg) => {
		const err = new Error(msg)
		err.status = status
		console.error(err)
		//throw err
	}
}