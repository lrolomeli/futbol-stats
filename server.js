const { createServer } = require('http')
const { parse } = require('url')
const os = require('os')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server)
  global.__io = io

  io.on('connection', (socket) => {
    const partidoId = socket.handshake.query.partidoId
    if (partidoId) {
      socket.join(`partido:${partidoId}`)
    }
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    for (const entry of Object.values(os.networkInterfaces())) {
      for (const net of entry || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`>   LAN:   http://${net.address}:${port}`)
        }
      }
    }
  })
})