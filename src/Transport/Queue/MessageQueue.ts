import { EventEmitter } from "events";
import MaxAttemptsError from "./MaxAttemptsError";
import QueueItem from "./QueueItem";
import Timer = NodeJS.Timer;
import { Envelop } from "../../Message/Envelop";
import { Request } from "../../Message/Request";
import { Response } from "../../Message/Response";

export const MAX_ATTEMPTS = 3;

export default class MessageQueue {

    private static from(request: Envelop<Request>, attempt: number  = 0): QueueItem {
        return new QueueItem(request, attempt);
    }

    private readonly emitter: EventEmitter;
    private readonly maxAttempts: number = MAX_ATTEMPTS;
    private readonly messages: Map<string, QueueItem> = new Map<string, QueueItem>();
    private readonly timers: Map<string, Timer> = new Map<string, Timer>();
    private timeoutAction?: (message: Envelop<Request>, attempt: number) => void;

    constructor(
        maxAttempts: number = MAX_ATTEMPTS,
    ) {
        this.maxAttempts = maxAttempts;
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        this.emitter.on("expired", this.onExpired.bind(this));
    }

    public size(): number {

        return this.messages.size;
    }

    public onTimeout(action: (message: Envelop<Request>, attempt: number) => void): void {
        this.timeoutAction = action;
    }

    public nextAttempt(uuid: string): void {
        const queueItem = this.messages.get(uuid);

        if (!queueItem) {
            return;
        }

        queueItem.fail();
    }

    public async enqueue(message: Envelop<Request>, attempt: number = 0): Promise<Envelop<Response>> {
        const messageQueueItem = MessageQueue.from(message, attempt);
        this.messages.set(message.uuid, messageQueueItem);

        this.timers.set(message.uuid, setTimeout(
            () => this.emitter.emit("expired", messageQueueItem),
            messageQueueItem.timeout(),
        ));

        return messageQueueItem.promise;
    }

    public ack(requestUuid: string, response: Envelop<Response>): void {

        if (! this.messages.has(requestUuid)) {
            return;
        }

        const item: QueueItem | undefined = this.messages.get(requestUuid);

        if (! item) {
            return;
        }

        item.ack(response);

        this.remove(requestUuid);
    }

    private onExpired(item: QueueItem): void {
        const uuid = item.message.uuid;

        if (item.iteration() >= this.maxAttempts) {
            this.remove(uuid);
            item.error(new MaxAttemptsError(uuid));
            return;
        }

        if (this.timeoutAction) {
            this.timeoutAction(item.message, item.iteration());
        }

        this.nextAttempt(uuid);
        this.timers.set(uuid, setTimeout(
            () => this.emitter.emit("expired", item),
            item.timeout(),
        ));
    }

    private remove(uuid: string): void {
        if (!this.messages.has(uuid)) {

            return;
        }

        clearTimeout(<Timer> this.timers.get(uuid));
        this.timers.delete(uuid);
        this.messages.delete(uuid);
    }

}
