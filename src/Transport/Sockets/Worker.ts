import {socket, Socket} from "zeromq";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";
import {Envelop} from "../../Message/Envelop";

export default class Worker {
    private readonly socket: Socket;

    constructor(private readonly address: string, type: string = 'router', options = {}) {
        this.socket = socket(type, options);
        this.socket.identity = `worker:${type}:${process.pid}`;
    }

    public start(reducer: (request: Request) => Response): void {
        this.socket.bindSync(this.address);
        this.receive(reducer);
    }

    private receive(reducer: (request: Request) => Response): void {
        this.socket.on(
            'message',
            (client: Buffer, empty: Buffer, request: Buffer) => {
                const requestEnvelop: Envelop<Request> = JSON.parse(request.toString());
                let responseEnvelop: Envelop<Response> = { uuid: requestEnvelop.uuid, message: { code: 0 } };

                switch (true) {
                    case requestEnvelop.message.path === 'ping':
                        responseEnvelop['message'] = { ...responseEnvelop.message, ...Worker.pong()};
                        break;
                    default:
                        responseEnvelop['message'] = { ...responseEnvelop.message, ...reducer(requestEnvelop.message)};
                }

                this.send(client, responseEnvelop);
            }
        );
    }

    private send(client:Buffer, response: Envelop<Response>): void {
        this.socket.send([
            client,
            '',
            Buffer.from(JSON.stringify(response))
        ]);
    }

    private static pong() {
        return {
            body: 'pong',
            code: 0
        };
    }

    public stop(): void {
        this.socket.close();
    }
}
