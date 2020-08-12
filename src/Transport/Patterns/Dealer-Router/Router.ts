import { socket, Socket } from "zeromq";
import { Envelop } from "../../../Message/Envelop";
import { Request } from "../../../Message/Request";
import { Response } from "../../../Message/Response";
import * as Buffering from "../../Buffer";
import { TracingProxy, TraceServerRequest } from "../../Tracing/TracingProxy";
import { Tracer } from "zipkin";

export class Router {

    protected static pong(): Response {
        return {
            body: "pong",
            code: 0,
        };
    }

    protected readonly connection: Socket;
    private readonly address: string;
    private readonly tracing: TracingProxy | undefined;

    constructor(
        address: string,
        type: string = "router",
        options = {},
        tracer?: Tracer,
        serviceName?: string,
    ) {
        this.address = address;
        this.connection = socket(type, options);
        this.connection.identity = `worker:${type}:${process.pid}`;
        if (tracer && serviceName) {
            this.tracing = new TracingProxy(tracer, this.connection.identity, serviceName);
        }
    }

    public start(reducer: (request: Request) => Response): void {
        this.connection.bindSync(this.address);
        this.receive(reducer);
    }

    public stop(): void {
        this.connection.close();
    }

    protected receive(reducer: (request: Request) => Response): void {
        this.connection.on(
            "message",
            (client: Buffer, empty: Buffer, request: Buffer) => {

                let trace: TraceServerRequest | undefined;

                const requestEnvelop: Envelop<Request> = Buffering.parse(request);

                if (requestEnvelop.message.path !== "ping" && this.tracing) {
                    trace = this.tracing.server(requestEnvelop);
                }

                const responseEnvelop: Envelop<Response> = {
                    uuid: requestEnvelop.uuid,
                    timeout: requestEnvelop.timeout,
                    message: {
                        code: 0,
                    },
                };

                const action = () => {
                    switch (true) {
                        case requestEnvelop.message.path === "ping":
                            responseEnvelop.message = { ...responseEnvelop.message, ...Router.pong()};
                            break;
                        default:
                            responseEnvelop.message = { ...responseEnvelop.message, ...reducer(requestEnvelop.message)};
                    }
                };

                if (requestEnvelop.message.path !== "ping" && trace) {
                    trace.local(`action:${ requestEnvelop.message.path}`, action);
                }  else {
                    action();
                }

                this.send(responseEnvelop, client);

                if (requestEnvelop.message.path !== "ping" && trace) {
                    trace.ok(responseEnvelop);
                }
            },
        );
    }

    protected send(response: Envelop<Response>, client?: Buffer): void {
        this.connection.send([
            client,
            "",
            Buffering.from(response),
        ]);
    }
}
