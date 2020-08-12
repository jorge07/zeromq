import { Dealer } from "../src/Transport/Patterns/Dealer-Router/Dealer";
import { format } from "util";
import { HttpLogger } from "zipkin-transport-http";
import * as zipkin from "zipkin";
import CLSContext from "zipkin-context-cls";
import { Response } from "../src/Message/Response";

const ADDRESS_LIST = [
    "tcp://127.0.0.1:3000",
    "tcp://127.0.0.1:3001",
];
const RETRIES = 3;
const OPTIONS = {};
const TIMEOUT = 3000;

const cli: Dealer = new Dealer(
    ADDRESS_LIST,
    OPTIONS,
    RETRIES,
    TIMEOUT,
    new zipkin.Tracer({
        ctxImpl: new CLSContext("zipkin"),
        recorder: new zipkin.BatchRecorder({
            logger: new HttpLogger({
                endpoint: "http://localhost:9411/api/v2/spans",
                jsonEncoder: zipkin.jsonEncoder.JSON_V2,
            }),
        }),
        localServiceName: "client",
    }),
);

void (async () => {
    await cli.start();

    const request = async () => {
        try {
            const response: Response = await cli.request({ body: { wut: "????" }, path: "demo" }, 100);

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
