import Dealer from "../src/Transport/Patterns/Dealer-Router/Dealer";
import { format } from "util";
import {BatchRecorder, Tracer} from "zipkin";
import {HttpLogger} from "zipkin-transport-http";
import * as zipkin from "zipkin";
import JSON_V2 = zipkin.jsonEncoder.JSON_V2;
import CLSContext from "zipkin-context-cls"
import {Response} from "../src/Message/Response";

const cli: Dealer = new Dealer(
    [
        "tcp://127.0.0.1:3000",
        "tcp://127.0.0.1:3001",
    ],
    {},
    3,
    3000,
    new Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new BatchRecorder({
            logger: new HttpLogger({
                endpoint: 'http://localhost:9411/api/v2/spans',
                jsonEncoder: JSON_V2
            })
        }),
        localServiceName: 'client'
    })
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
