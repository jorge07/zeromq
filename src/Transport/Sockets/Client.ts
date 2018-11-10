import { socket, Socket } from "zeromq";
import envelop, {Envelop, TIMEOUT} from "../../Message/Envelop";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";
import Buffering from "../Buffer";
import MessageQueue, {MAX_ATTEMPTS} from "../Queue/MessageQueue";
import WorkerPool from "./Pool/WorkerPool";
import ClientNotReady from "./Exception/ClientNotReady";

export default class  Client {
    private status: boolean = false;
    private readonly socket: Socket;
    private readonly queue: MessageQueue;
    private readonly workersPool: WorkerPool;

    constructor(
        private readonly addresses: string[],
        private readonly type: string = "dealer", options = {},
        private readonly retries: number = MAX_ATTEMPTS,
        private readonly connectionTimeout: number = TIMEOUT,
    ) {
        this.socket = socket(type, options);
        this.socket.identity = `client:${type}:${process.pid}`;
        this.workersPool = new WorkerPool();
        this.queue = new MessageQueue(retries);
        this.queue.onTimeout(this.send.bind(this));
    }

    public async request(request: Request, timeout?: number|null): Promise<Response> {
        if (! this.status) {
            throw new ClientNotReady();
        }

        const requestEnvelop: Envelop<Request> = envelop<Request>(request, timeout || this.connectionTimeout);

        const promise = this.queue.enqueue(requestEnvelop);

        this.send(requestEnvelop);

        return promise.then((envelop: Envelop<Response>) => (envelop.message));
    }

    public start(): Promise<Client> {
        this.connect();

        this.socket.monitor();
        return new Promise<Client>((resolve, reject) => {
            this.workersPool.onConnected(() => {
                this.status = true;
                this.receive();
                resolve(this);
            });
            this.workersPool.onDisconnected(() => {
                this.status = true;
                reject(this)
            });
        });
    }

    public routers(addresses: string[]): void {
        this.workersPool.populate(addresses);
    }

    public stop(): void {
        this.socket.close();
        this.workersPool.stop();
    }

    private ack(uuid: string, response: Envelop<Response>): void {
        this.queue.ack(uuid, response);
    }

    private connect(): void {
        if (this.addresses.length === 0) {
            throw new Error("Provide at least one endpoint");
        }

        this.workersPool.populate(this.addresses);

        this.workersPool.onPromote((address: string) => {
            this.socket.connect(address);
        });

        this.workersPool.onDemote((address: string) => {
            this.socket.disconnect(address);
        });
    }

    private receive(): void {
        this.socket.on("message", (id: Buffer, response: Buffer) => {
            const envelop: Envelop<Response> = Buffering.toString(response);
            this.ack(envelop.uuid, envelop);
        });
    }

    private send(envelop: Envelop<Request>): void {
        this.socket.send([
            "",
            Buffering.from(envelop),
        ]);
    }
}
