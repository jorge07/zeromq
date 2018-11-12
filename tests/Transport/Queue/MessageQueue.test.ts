import envelop, { Envelop } from "../../../src/Message/Envelop";
import { Request } from "../../../src/Message/Request";
import { Response } from "../../../src/Message/Response";
import MessageQueue from "../../../src/Transport/Queue/MessageQueue";

test("should be able to add an item to the queue", async () => {
    const queue: MessageQueue = new MessageQueue();
    const promise: Promise<Envelop<Response>> =  queue.enqueue(envelop<Request>({ path: "test" }, 200));

    expect(queue.size()).toBe(1);

    const result = expect(promise).rejects.toBeInstanceOf(Error);

    return result.then(() => expect(queue.size()).toBe(0));
});
