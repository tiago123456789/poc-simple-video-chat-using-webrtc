
import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path"

export class Server {

    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;
    private activeSockets:  { [key: string]: string } = {};
    private readonly DEFAULT_PORT = 5000;

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app)
        // @ts-ignore
        this.io = socketIO(this.httpServer, { allowEIO3: true })
        this.enableAssets()
        this.handleSocketConnection()
        this.handleRoutes()
        
    }

    private enableAssets() {
        this.app.use(express.static(path.join(__dirname, "..", "../public")))
    }

    private handleRoutes() {
        this.app.get("/", (_, response) => {
            response.sendFile(
                path.join(__dirname, "..", "../public", "index.html")
            )
        })
    }

    private handleSocketConnection() {
        this.io.on("connection", (socket) => {

            if (!this.activeSockets[socket.id]) {
                this.activeSockets[socket.id] = socket.id;

                let activesSocket = {...this.activeSockets}
                delete activesSocket[socket.id];
                const activeSocketsAnotherUsers = Object.keys(activesSocket)
                socket.emit("update-user-list", {
                    users: activeSocketsAnotherUsers
                })

                socket.broadcast.emit("update-user-list", { users: [socket.id] })
            }

            socket.on("disconnect", () => {
                delete this.activeSockets[socket.id];
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                })
            })

            socket.on("create-offer", (data) => {
                socket.to(data.to).emit("made-offer", { ...data, to: socket.id })
            })

            socket.on("create-answer", (data) => {
                socket.to(data.to).emit("made-answer", { ...data, to: socket.id })
            })
        })
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.DEFAULT_PORT, '0.0.0.0', () =>
            callback(this.DEFAULT_PORT)
        );
    }
}