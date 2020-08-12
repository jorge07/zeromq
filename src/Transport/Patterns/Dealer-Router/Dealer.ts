import { socket, Socket } from "zeromq";
import { envelop, Envelop, TIMEOUT } from "../../../Message/Envelop";
import { Request } from "../../../Message/Request";
import { Response } from "../../../Message/Response";
import * as Buffering from "../../Buffer";
import { MessageQueue, MAX_ATTEMPTS } from "../../Queue/MessageQueue";
import { WorkerPool } from "../../Sockets/Pool/WorkerPool";
import { ClientNotReady } from "../../Sockets/Exception/ClientNotReady";
import { Tracer } from "zipkin";
import { TracingProxy, TraceRequest } from "../../Tracing/TracingProxy";

export class  Dealer {
    private status: boolean = false;
    private readonly socket: Socket;
    private readonly queue: MessageQueue;
    private readonly workersPool: WorkerPool;
    private readonly addresses: Set<string> = new Set<string>();
    private readonly retries: number = MAX_ATTEMPTS;
    private readonly connectionTimeout: number = TIMEOUT;
    private readonly tracing: TracingProxy | undefined;

    constructor(
        addresses: string[],
        options: any = {},
        retries: number = MAX_ATTEMPTS,
        connectionTimeout: number = TIMEOUT,
        tracer?: Tracer,
    ) {
        addresses.forEach((address: string) => this.addresses.add(address));
        this.retries = retries;
        this.connectionTimeout = connectionTimeout;
        this.socket = socket("dealer", options);
        this.socket.identity = `client:dealer:${process.pid}`;
        this.workersPool = new WorkerPool();
        this.queue = new MessageQueue(retries);
        this.queue.onTimeout(this.send.bind(this));
        if (tracer) {
            this.tracing = new TracingProxy(tracer, this.socket.identity, 'client');
        }
    }

    public async request(request: Request, timeout?: number | null): Promise<Response> {
        if (! this.status) {
            throw new ClientNotReady();
        }

        let trace: TraceRequest | undefined;

        const requestEnvelop: Envelop<Request> = envelop<Request>(request, timeout || this.connectionTimeout);

        if (this.tracing) {
            trace = this.tracing.client(requestEnvelop);
        }

        const promise = this.queue.enqueue(requestEnvelop, 0, trace);

        this.send(requestEnvelop);

        return promise.then((responseEnvelop: Envelop<Response>) => responseEnvelop.message);
    }

    public async start(): Promise<Dealer> {
        this.connect();

        this.socket.monitor();

        return new Promise<Dealer>((resolve, reject) => {
            this.workersPool.onConnected(() => {
                this.status = true;
                this.receive();
                resolve(this);
            });
            this.workersPool.onDisconnected(() => {
                this.status = true;
                reject(this);
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
        if (this.addresses.size === 0) {
            throw new Error("Provide at least one endpoint");
        }

        this.workersPool.populate(Array.from(this.addresses.values()));

        this.workersPool.onPromote((address: string) => {
            this.socket.connect(address);
        });

        this.workersPool.onDemote((address: string) => {
            this.socket.disconnect(address);
        });
    }

    private receive(): void {
        this.socket.on("message", (id: Buffer, response: Buffer) => {
            const envelopedMessage: Envelop<Response> = Buffering.parse(response);
            this.ack(envelopedMessage.uuid, envelopedMessage);
        });
    }

    private send(requestEnvelop: Envelop<Request>): void {
        this.socket.send([
            "",
            Buffering.from(requestEnvelop),
        ]);
    }
}
