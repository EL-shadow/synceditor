const http = require('http')
const https = require('https')

const clientID = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

if (!clientID || !clientSecret) {
    console.error('ERROR: Environment variables CLIENT_ID and CLIENT_SECRET must be set.')
    process.exit(1)
}

http.createServer((req, res) => {
    router(req, res, [
        ['GET', '/synceditor/callback', getCallback],
        ['POST', '/synceditor/proxy', postProxy]
    ])
}).listen(8080)

function router(req, res, routes) {
    const url = new URL(req.url, 'http://localhost')

    console.log(req.method, req.url)
    for (const route of routes) {
        if (route[0] === req.method && route[1] === url.pathname) {
            route[2](req, res)
            return
        }
    }

    res.writeHead(404)
    res.end('Not Found')
}

function getCallback(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const code = url.searchParams.get('code')
    const redir = url.searchParams.get('redir')

    if (!code) {
        res.writeHead(400)
        res.end('ERROR: Parameter "code" is not set.')
        return
    }

    if (!redir) {
        res.writeHead(400)
        res.end('ERROR: Parameter "redir" is not set.')
        return
    }

    const postData = JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code: code
    })

    const postReq = https.request({
        host: 'github.com',
        port: 443,
        method: 'POST',
        path: '/login/oauth/access_token',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Accept': 'application/json'
        }
    }, (postRes) => {
        let rawData = ''
        postRes.setEncoding('utf8')
        postRes.on('data', (chunk) => {rawData += chunk})
        postRes.on('end', () => {
            const parsedData = JSON.parse(rawData)
            const redirUrl = new URL(decodeURIComponent(redir))

            redirUrl.searchParams.set('token', parsedData.access_token)
            res.writeHead(301, {'Location': redirUrl.toString()})
            res.end()
        })
    })

    postReq.on('error', (error) => {
        console.error(`problem with request: ${error.message}`);
        res.writeHead(500)
        res.end(JSON.stringify(error))
    })

    postReq.write(postData)
    postReq.end()
}

function postProxy(req, res) {
    let rawBody = ''
    req.on('data', (chunk) => {rawBody += chunk})
    req.on('end', () => {
        const query = decodeQuery(rawBody)
        const url = new URL(query.url)
        url.password = query.token

        const getReq = https.request(url, (getRes) => {
            let rawData = ''
            getRes.setEncoding('utf8')
            getRes.on('data', (chunk) => {rawData += chunk})
            getRes.on('end', () => {
                console.log(`Received ${url.toString()} ${rawData.length}`)
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'private',
                    'Content-Type': 'text/plain; charset=utf-8'
                })
                res.end(rawData)
            })
        })

        getReq.on('error', (error) => {
            console.error(`problem with request: ${error.message}`);
            res.writeHead(500)
            res.end(JSON.stringify(error))
        })

        getReq.end()
    })
}

function decodeQuery(queryString) {
    const result = {}
    const regexp = /\+/g

    if (typeof queryString !== 'string' || queryString.length === 0) {
        return result
    }

    for (const _kv of queryString.split('&')) {
        const kv = _kv.replace(regexp, '%20')
        const idx = kv.indexOf('=')
        const key = decodeURIComponent(idx >= 0 ? kv.substr(0, idx) : kv)
        const value = idx >= 0 ? decodeURIComponent(kv.substr(idx + 1)) : ''

        if (!Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = value
        } else if (Array.isArray(result[key])) {
            result[key].push(value)
        } else {
            result[key] = [result[key], value]
        }
    }

    return result
}
