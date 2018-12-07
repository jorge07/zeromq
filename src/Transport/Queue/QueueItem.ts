import { Envelop } from "../../Message/Envelop";
import { Request } from "../../Message/Request";
import { Response } from "../../Message/Response";
import {TraceRequest} from "../Tracing/TracingProxy";

export default class QueueItem {

    public static from(request: Envelop<Request>, attempt: number  = 0, tracing?: TraceRequest): QueueItem {
        return new QueueItem(request, attempt, tracing);
    }

    public readonly promise: Promise<Envelop<Response>>;
    public readonly tracing?: TraceRequest;

    private attempts: number = 0;
    public readonly message: Envelop<Request>;
    private resolve: any;
    private reject: any;

    constructor(
        message: Envelop<Request>,
        attempts: number = 0,
        tracing?: TraceRequest
    ) {
        this.attempts = attempts;
        this.message = message;
        this.tracing = tracing;
        this.promise = new Promise<Envelop<Response>>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    public ack(response: Envelop<Response>): void {
        this.resolve(response);
        if (this.tracing) {
            this.tracing.ok(response);
        }
    }

    private expired(): void {
        if (this.tracing) {
            this.tracing.timeout(this.attempts, this.message);
        }
    }

    public error(error: any): void {
        this.reject(error);
    }

    public id(): string {
        return this.message.uuid;
    }

    public fail(): void {
        this.expired();
        this.attempts += 1;
    }

    public iteration(): number {
        return this.attempts;
    }

    public timeout(): number {

        return this.message.timeout;
    }
}
