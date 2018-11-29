import Router from "../src/Transport/Patterns/Dealer-Router/Router";

const server: Router = new Router("tcp://127.0.0.1:3001");

server.start(() => (
    {
        body: {
            res: "ok",
            worker: process.pid,
        },
        code: 0,
    }
));
