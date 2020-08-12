import { envelop } from "../../../src/Message/Envelop";
import { Request } from "../../../src/Message/Request";
import { QueueItem } from "../../../src/Transport/Queue/QueueItem";

it("QueueItem getters", () => {
    const requestEnvelop = envelop<Request>({path: "test"});
    const item: QueueItem = new QueueItem(requestEnvelop);

    expect(item.id()).toBeTruthy();
    expect(item.message).toBe(requestEnvelop);
    expect(item.iteration()).toBe(0);
    item.fail();
    expect(item.iteration()).toBe(1);
});
