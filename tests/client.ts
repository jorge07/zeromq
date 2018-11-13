import Client from "../src/Transport/Sockets/Client";
import { format } from "util";

const cli: Client = new Client([
    "tcp://127.0.0.1:3000",
    "tcp://127.0.0.1:3001",
]);

void (async () => {
    await cli.start();

    const request = async () => {
        try {
            const response = await cli.request({ body: { wut: "????" }, path: "ping" }, 100);

            process.stdout.write(format(response));

        } catch (e) {
            process.stdout.write(format(e.message));
            process.stdout.write("Message LOST");
        }
    };

    setInterval(request, 100);
})();
