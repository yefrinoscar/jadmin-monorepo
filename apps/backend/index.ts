import { Server } from "bun";

const server = Bun.serve({
    port: 8080,
    fetch(req: Request, server: Server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a response
        }
        return new Response("Upgrade failed :(", { status: 500 });
    },
    websocket: {
        message(ws: any, message: string) {
            console.log(`Received ${message}`);
            ws.send(`You said: ${message}`);
        }, // a message is received
        open(ws: any) {
            console.log("WebSocket opened");
        }, // a socket is opened
        close(ws: any, code: number, message: string) {
            console.log("WebSocket closed");
        }, // a socket is closed
        drain(ws: any) {
            console.log("WebSocket drained");
        }, // the socket is ready to receive more data
    },
});

console.log(`Listening on http://${server.hostname}:${server.port}`);
