import { socket, Socket } from "zeromq";
import {Response} from "../../Message/Response";
import {Request} from "../../Message/Request";
import MessageQueue from "../Queue/MessageQueue";
import WorkerPool from "./Pool/WorkerPool";
import envelop, {Envelop} from "../../Message/Envelop";

export default class  Client {
    private readonly socket: Socket;
    private readonly queue: MessageQueue;
    private readonly workersPool: WorkerPool;

    constructor(
        private readonly addresses: string[],
        type: string = 'dealer', options = {}
    ) {
        this.socket = socket(type, options);
        this.socket.identity = `client:${type}:${process.pid}`;
        this.workersPool = new WorkerPool();
        this.queue = new MessageQueue();
        this.queue.onTimeout((envelop: Envelop<Request>) => console.log('Fail attempt: ', envelop.uuid));
    }


    public async request(request: Request): Promise<Response> {
        const requestEnvelop: Envelop<Request> = envelop<Request>(request);

        const promise = this.queue.enqueue(requestEnvelop);

        this.send(requestEnvelop);

        return promise.then((envelop: Envelop<Response>) => (envelop.message));
    }

    private ack(uuid: string, response: Envelop<Response>): void {
        this.queue.ack(uuid, response);
    }

    public start(): Client {
        this.connect();
        this.receive();

        return this;
    }

    private connect(): void {
        if (this.addresses.length === 0) {
            throw new Error('Provide at least one endpoint');
        }

        this.workersPool.populate(this.addresses);

        this.workersPool.onPromote((address: string) => {
            this.socket.connect(address)
        });
        this.workersPool.onDemote((address: string) => {
            this.socket.disconnect(address)
        });
    }

    private receive(): void {
        this.socket.on('message', (id: Buffer, response: Buffer) => {
            const envelop: Envelop<Response> = JSON.parse(response.toString());
            this.ack(envelop.uuid, envelop);
        });
    }

    private send(envelop: Envelop<Request>): void {

        const buffer: Buffer = Buffer.from(JSON.stringify(envelop), 'utf8');

        this.socket.send([
            '',
            buffer
        ]);

    }

    public stop(): void {
        this.socket.close();
        this.workersPool.stop();
    }
}
