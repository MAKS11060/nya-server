export const pathnameNormalize = (...path: string[]): string => {
  return `/${path.join('/').split('/').filter(v => v).join('/')}`
}

export const parseAccept = (accept: string) => {
  return (accept.split(',').map(v => ({
    ...v.trim().match(/(?<content>(?<type>.+?)\/(?<sub>.+?)(?:\+(?<suffix>.+?))?)(?:;.*?(?:q=(?<weight>[.\d]+))?.*?)?(?:,|$)/).groups,
  })) as {
    content: string,
    type: string,
    sub: string,
    suffix: string,
    weight: string
  }[])
}

/**
 * Copy Headers to Dist
 */
export const copyHeaders = (dist: Headers, headers?: Headers) => {
  if (headers) {
    if (headers instanceof Headers) {
      for (let [name, value] of headers) {
        if (name === 'set-cookie') dist.append(name, value)
        else dist.set(name, value)
      }
    } else {
      throw new TypeError('headers must be of type Headers')
    }
  }
}


/**
 * Parse Accept-Encoding: `br, deflate, gzip;q=1.0`
 */
// export const acceptEncoding = (headers: Headers, algorithms?: CompressAlgorithm[]) => {
//   if (!headers.has('accept-encoding')) return
//   const ae = headers.get('accept-encoding').split(',').map(v => v.trim().split(';')[0])
//   for (const algorithm of algorithms) {
//     if (ae.includes(algorithm)) {
//       return algorithm as CompressAlgorithm
//     }
//   }
// }
