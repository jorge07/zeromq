import {Envelop} from "../../Message/Envelop";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";

export default class QueueItem {

    private resolve: any;
    private reject: any;
    public readonly promise: Promise<Envelop<Response>>;
    constructor(
        public readonly message: Envelop<Request>,
        private attempts: number = 0,
    ) {
        this.promise = new Promise<Envelop<Response>>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    public ack(response: Envelop<Response>): void {
        this.resolve(response);
    }

    public error(error: any): void {
        this.reject(error);
    }

    public id(): string {

        return this.message.uuid;
    }

    public fail(): void {
        this.attempts += 1;
    }

    public iteration(): number {
        return this.attempts;
    }
}
