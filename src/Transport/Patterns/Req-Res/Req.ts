import { socket, Socket, SocketOptions} from "zeromq";
import {Envelop} from "../../../Message/Envelop";
import {Request} from "../../../Message/Request";
import {Response} from "../../../Message/Response";

export type Action = (message: Envelop<Response>) => any;

export default class Req {

    private readonly socket: Socket;
    constructor(
        private readonly addresses: string[],
        options: SocketOptions,
    ) {
        this.socket = socket("req", options);
    }

    public start(action: Action): void {
        this.bind();
        this.onMessage(action);
    }

    public send(req: Request): void {
        this.socket.send(JSON.stringify(req));
    }

    public close(): void {
        this.socket.close();
    }

    private onMessage(action: Action): void {
        this.socket.on("message", (msg: Buffer) => {
            const message: Envelop<Response> = JSON.parse(msg.toString());
            action(message);
        });
    }

    private bind(): void {
        this.addresses.forEach((address: string) => this.socket.connect(address));
    }
}
