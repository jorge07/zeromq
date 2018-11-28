import Dealer from "../src/Transport/Patterns/Dealer-Router/Dealer";
import { format } from "util";

const cli: Dealer = new Dealer([
    "tcp://127.0.0.1:3000",
    "tcp://127.0.0.1:3001",
]);

void (async () => {
    await cli.start();

    const request = async () => {
        try {
            const response = await cli.request({ body: { wut: "????" }, path: "yeah" }, 100);

            process.stdout.write(format(response));
            process.stdout.write("\n");
        } catch (e) {
            process.stdout.write(format(e.message));
            process.stdout.write("\n");
            process.stdout.write("Message LOST");
            process.stdout.write("\n");
        }
    };

    setInterval(request, 100);
})();
