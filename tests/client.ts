import Client from "../src/Transport/Sockets/Client";
import { format } from "util";

const cli: Client = new Client([
    "tcp://127.0.0.1:3000",
]);

void (async () => {
    try {
        await cli.start();
        const response = await cli.request({
            body: { wut: "????" },
            path: "ping",
        });

        format(response);
    } catch (e) {
        format(e.message);
    } finally {
        cli.stop();
    }
})();
