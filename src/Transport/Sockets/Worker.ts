import {socket, Socket} from "zeromq";
import {Envelop} from "../../Message/Envelop";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";
import Buffering from "../Buffer";

export default class Worker {

    private static pong(): Response {
        return {
            body: "pong",
            code: 0,
        };
    }

    private readonly socket: Socket;

    constructor(private readonly address: string, type: string = "router", options = {}) {
        this.socket = socket(type, options);
        this.socket.identity = `worker:${type}:${process.pid}`;
    }

    public start(reducer: (request: Request) => Response): void {
        this.socket.bindSync(this.address);
        this.receive(reducer);
    }

    public stop(): void {
        this.socket.close();
    }

    private receive(reducer: (request: Request) => Response): void {
        this.socket.on(
            "message",
            (client: Buffer, empty: Buffer, request: Buffer) => {
                const requestEnvelop: Envelop<Request> = Buffering.toString(request);
                let responseEnvelop: Envelop<Response> = { uuid: requestEnvelop.uuid, timeout: requestEnvelop.timeout, message: { code: 0 } };

                switch (true) {
                    case requestEnvelop.message.path === "ping":
                        responseEnvelop.message = { ...responseEnvelop.message, ...Worker.pong()};
                        break;
                    default:
                        responseEnvelop.message = { ...responseEnvelop.message, ...reducer(requestEnvelop.message)};
                }

                this.send(client, responseEnvelop);
            },
        );
    }

    private send(client: Buffer, response: Envelop<Response>): void {
        this.socket.send([
            client,
            "",
            Buffering.from(response),
        ]);
    }
}
