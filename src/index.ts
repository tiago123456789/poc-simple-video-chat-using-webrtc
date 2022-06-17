import { Server } from "./configs/Server"

const server = new Server();

server.listen(port => {
    console.log(`Server is running on http://localhost:${port}`)
})