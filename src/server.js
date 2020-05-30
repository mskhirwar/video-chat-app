"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
class Server {
    constructor() {
        this.activeSockets = [];
        this.DEFAULT_PORT = 5000;
        this.initialize();
    }
    initialize() {
        this.app = express_1.default();
        this.httpServer = http_1.createServer(this.app);
        this.io = socket_io_1.default(this.httpServer);
        this.configureApp();
        this.handleRoutes();
        this.handleSocketConnection();
    }
    configureApp() {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
    }
    handleRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile('index.html');
        });
    }
    handleSocketConnection() {
        this.io.on('connection', socket => {
            console.log(`Socket connected.`);
            const existingSocket = this.activeSockets.find(existingSocket => existingSocket === socket.id);
            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                socket.emit('update-user-list', {
                    users: this.activeSockets.filter(existingSocket => existingSocket !== socket.id)
                });
                socket.broadcast.emit('update-user-list', {
                    users: [socket.id]
                });
            }
            socket.on('call-user', data => {
                socket.to(data.to).emit('call-made', {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on('make-answer', data => {
                socket.to(data.to).emit('answer-made', {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on('disconnect', () => {
                this.activeSockets = this.activeSockets.filter(existingSocket => existingSocket !== socket.id);
                socket.broadcast.emit('remove-user', {
                    socketId: socket.id
                });
            });
        });
    }
    listen(callback) {
        const _port = process.env.PORT || this.DEFAULT_PORT;
        this.httpServer.listen(_port, () => callback(_port));
    }
}
exports.Server = Server;
