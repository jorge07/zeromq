import Client from "../src/Transport/Sockets/Client";

const cli: Client = new Client([
    "tcp://127.0.0.1:3001",
    "tcp://127.0.0.1:3000",
]);

cli.start();

cli
    .request({
        body: { wut: "????" },
        path: "ping",
    })
    .then(console.log)
;
