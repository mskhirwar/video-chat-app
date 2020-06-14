import express, { Application } from 'express'
import socketIO, { Server as SocketIOServer } from 'socket.io'
import { createServer, Server as HTTPServer } from 'http'
import path from 'path'

export class Server {
  private httpServer: HTTPServer
  private app: Application
  private io: SocketIOServer

  private clients: string[] = []

  private peersByCode = {}

  private readonly DEFAULT_PORT = 5000

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.io = socketIO(this.httpServer)

    this.configureApp()
    this.handleRoutes()
    this.handleSocketConnection()
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, '../public')))
  }

  private handleRoutes(): void {
    this.app.get('/', (req, res) => {
      res.sendFile('index.html')
    })
  }

  private handleSocketConnection(): void {
    this.io.on('connection', (socket) => {
      console.log('user is connected', socket.id)

      const socketId = socket.id
      const existingClient = this.clients.find(
        (existingClient) => existingClient === socket.id
      )

      if (!existingClient) {
        this.clients.push(socket.id)
        socket.broadcast.emit('message', {
          client: socket.id,
          text: 'I am connected!',
        })
      }

      socket.on('message', (event) => {
        console.log('user sent a message', event)

        const { code } = event

        const isUserAlreadyPaired =
          this.peersByCode[code] &&
          this.peersByCode[code].find((peer) => peer.id === socketId)

        if (!this.peersByCode[code]) {
          this.peersByCode[code] = [{ id: socketId }]
        } else if (!isUserAlreadyPaired) {
          this.peersByCode[code].push({ id: socketId })
        }

        const peer = this.peersByCode[code].find((peer) => peer.id !== socketId)

        if (peer) {
          socket.broadcast.emit('message', event)
        }
      })

      socket.on('disconnect', () => {
        console.log('user is disconnected')

        if (!existingClient) {
          // this.clients.push(socket.id)
          socket.broadcast.emit('message', {
            client: socket.id,
            text: 'I am disconnected!',
          })
        }
      })
    })
  }

  public listen(callback: (port: string | number) => void): void {
    const _port = process.env.PORT || this.DEFAULT_PORT
    this.httpServer.listen(_port, () => callback(_port))
  }
}
