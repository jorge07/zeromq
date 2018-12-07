import Router from "../src/Transport/Patterns/Dealer-Router/Router";
import {BatchRecorder, Tracer} from "zipkin";
import CLSContext from "zipkin-context-cls";
import {HttpLogger} from "zipkin-transport-http";
import * as zipkin from "zipkin";
import JSON_V2 = zipkin.jsonEncoder.JSON_V2;

const server: Router = new Router(
    "tcp://127.0.0.1:3000",
    "router",
    {},
    new Tracer({
        ctxImpl: new CLSContext('zipkin'),
        recorder: new BatchRecorder({
            logger: new HttpLogger({
                endpoint: 'http://localhost:9411/api/v2/spans',
                jsonEncoder: JSON_V2
            })
        }),
        localServiceName: 'customWorker',
    }),
    'customServer'
);

server.start(() => (
    {
        body: {
            res: "ok",
            worker: process.pid,
        },
        code: 0,
    }
));
