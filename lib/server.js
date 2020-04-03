const { createSecureServer: createHTTP2 } = require('http2')
const { createServer: createHTTP } = require('http')
const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')


module.exports = store => {
	const http = createHTTP()
	const https = createHTTP2({
		allowHTTP1: true,
		settings: {
			enableConnectProtocol: true,
		}
	})
	
	
	const setCert = (domain, certs) => {
		https.addContext(domain, {
			cert: certs.cert,
			key: certs.key,
			ca: certs.ca
		})
	}
	
	const setCerts = certs => {
		for (const domain in certs) {
			https.addContext(domain, {
				cert: certs[domain].cert,
				key: certs[domain].key,
				ca: certs[domain].ca
			})
		}
	}
	
	const setSSL = (dir, key, cert) => {
		for (const domain of readdirSync(dir)) {
			setCert(domain, {
				key: readFileSync(join(dir, domain, key ? key : 'privkey.pem')),
				cert: readFileSync(join(dir, domain, cert ? cert : 'fullchain.pem'))
			})
		}
	}
	
	
	return {
		http, https,
		setCert, setCerts, setSSL
	}
}
