import { socket, Socket } from "zeromq";
import { Envelop } from "../../Message/Envelop";
import { Request } from "../../Message/Request";
import { Response } from "../../Message/Response";
import Buffering from "../Buffer";

export default class Worker {

    protected static pong(): Response {
        return {
            body: "pong",
            code: 0,
        };
    }

    protected readonly connection: Socket;
    private readonly address: string;

    constructor(
        address: string,
        type: string = "router",
        options = {},
    ) {
        this.address = address;
        this.connection = socket(type, options);
        this.connection.identity = `worker:${type}:${process.pid}`;
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
                const requestEnvelop: Envelop<Request> = Buffering.parse(request);
                const responseEnvelop: Envelop<Response> = {
                    uuid: requestEnvelop.uuid,
                    timeout: requestEnvelop.timeout,
                    message: {
                        code: 0,
                    },
                };

                switch (true) {
                    case requestEnvelop.message.path === "ping":
                        responseEnvelop.message = { ...responseEnvelop.message, ...Worker.pong()};
                        break;
                    default:
                        responseEnvelop.message = { ...responseEnvelop.message, ...reducer(requestEnvelop.message)};
                }

                this.send(responseEnvelop, client);
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
