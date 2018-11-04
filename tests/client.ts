import Client from "../src/Transport/Sockets/Client";

const cli: Client = new Client([
    "tcp://127.0.0.1:3000",
]);

cli
    .start()
    .request({
        body: { wut: "????" },
        path: "ping",
    })
    .then(console.log)
    .then(() => {
        cli.stop();
    })
    .catch(console.error)
;
