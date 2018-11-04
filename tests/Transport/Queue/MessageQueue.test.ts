import envelop, { Envelop } from "../../../src/Message/Envelop";
import { Request } from "../../../src/Message/Request";
import { Response } from "../../../src/Message/Response";
import MessageQueue from "../../../src/Transport/Queue/MessageQueue";

it("should be able to add an item to the queue", () => {
    const queue: MessageQueue = new MessageQueue();

    const promise: Promise<Envelop<Response>> = queue.enqueue(envelop<Request>({ path: "test" }));

    expect(promise).toBeInstanceOf(Promise);
});
