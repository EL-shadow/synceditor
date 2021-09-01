const http = require('http')
const https = require('https')

const clientID = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

if (!clientID || !clientSecret) {
    console.error('ERROR: Environment variables CLIENT_ID and CLIENT_SECRET must be set.')
    process.exit(1)
}

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const code = url.searchParams.get('code')
    const redir = url.searchParams.get('redir')

    console.log(req.method, req.url)

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
        console.error(`problem with request: ${e.message}`);
        res.writeHead(500)
        res.end(JSON.stringify(error))
    })

    postReq.write(postData)
    postReq.end()
}).listen(8080)
