import {EventEmitter} from "events";
import MaxAttemptsError from "./MaxAttemptsError";
import QueueItem from "./QueueItem";
import Timer = NodeJS.Timer;
import {Envelop} from "../../Message/Envelop";
import {Request} from "../../Message/Request";
import {Response} from "../../Message/Response";

export const MAX_ATTEMPTS = 3;

export default class MessageQueue {

    private static from(request: Envelop<Request>, attempt: number  = 0): QueueItem {
        return new QueueItem(request, attempt);
    }

    private readonly messages: { [key: string]: QueueItem} = {};
    private readonly timers: { [key: string]: Timer } = {};
    private readonly emitter: EventEmitter;
    private timeoutAction?: (message: Envelop<Request>, attempt: number) => void;

    constructor(
        private readonly maxAttempts: number = MAX_ATTEMPTS
    ) {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);

        this.emitter.on("expired", this.onExpired.bind(this));
    }

    public size(): number {

        return Object.keys(this.messages).length;
    }

    public onTimeout(action: (message: Envelop<Request>, attempt: number) => void): void {
        this.timeoutAction = action;
    }

    public nextAttempt(uuid: string): void {
        this.messages[uuid].fail();
    }

    public enqueue(message: Envelop<Request>, attempt: number = 0): Promise<Envelop<Response>> {
        const messageQueueItem = MessageQueue.from(message, attempt);
        this.messages[message.uuid] = messageQueueItem;

        this.timers[message.uuid] = setTimeout(() => this.emitter.emit("expired", messageQueueItem), messageQueueItem.timeout());

        return messageQueueItem.promise;
    }

    public ack(requestUuid: string, response: Envelop<Response>): void {

        if (! this.messages.hasOwnProperty(requestUuid)) {
            return;
        }

        const item: QueueItem = this.messages[requestUuid];

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
        this.timers[item.message.uuid] = setTimeout(() => this.emitter.emit("expired", item), item.timeout());
    }

    private remove(uuid: string): void {
        if (this.messages.hasOwnProperty(uuid)) {
            clearTimeout(this.timers[uuid]);
            delete this.timers[uuid];
            delete this.messages[uuid];
        }
    }

}
