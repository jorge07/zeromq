import QueueItem from "./QueueItem";
import MaxAttemptsError from "./MaxAttemptsError";
import {EventEmitter} from "events";
import Timer = NodeJS.Timer;
import {Request} from "../../Message/Request";
import {Envelop} from "../../Message/Envelop";
import {Response} from "../../Message/Response";

export const ITEM_EXPIRATION = 2000;
export const MAX_ATTEMPTS = 3;

export default class MessageQueue {
    private readonly messages: { [key: string]: QueueItem} = {};
    private readonly timers: { [key: string]: Timer } = {};
    private readonly emitter: EventEmitter;
    private timeoutAction?: (message: Envelop<Request>, attempt: number) => void;

    constructor(
        private readonly ttl: number = ITEM_EXPIRATION
    ) {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);

        this.emitter.on('expired', this.onExpired.bind(this));
    }

    private onExpired(item: QueueItem): void {

        const uuid = item.message.uuid;

        if (! item) {
            return; // already processed
        }

        if (item.iteration() > MAX_ATTEMPTS) {
            this.remove(uuid);
            item.error(new MaxAttemptsError(uuid));
        }

        if (this.timeoutAction) {
            this.timeoutAction(item.message, item.iteration());
        }

        this.nextAttempt(uuid);
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

        this.timers[message.uuid] = setTimeout(() => this.emitter.emit('expired', messageQueueItem), this.ttl);

        return messageQueueItem.promise;
    }

    private static from(request: Envelop<Request>, attempt: number  = 0): QueueItem {

        return new QueueItem(request, attempt);
    }

    private remove(uuid: string): void {
        if (this.messages.hasOwnProperty(uuid)) {
            clearTimeout(this.timers[uuid]);
            delete this.timers[uuid];
            delete this.messages[uuid];
        }
    }

    public ack(requestUuid: string, response: Envelop<Response>): void {

        if (! this.messages.hasOwnProperty(requestUuid)) {
            return;
        }

        const item: QueueItem = this.messages[requestUuid];

        item.ack(response);

        this.remove(requestUuid);
    }

    public size(): number {

        return Object.keys(this.messages).length;
    }
}
