import Worker from "../src/Transport/Sockets/Worker";

const server: Worker = new Worker("tcp://127.0.0.1:3001");

server.start(() => (
    {
        body: {
            res: "ok",
            worker: process.pid,
        },
        code: 0,
    }
));
