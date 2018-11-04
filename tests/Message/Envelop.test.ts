import envelop, {Envelop} from "../../src/Message/Envelop";
import {Request} from "../../src/Message/Request";
import uuid = require("uuid");

it("should decorate an object", () => {
    const msg: Envelop<Request> = envelop<Request>({ path: "ping" });

    expect(msg).toHaveProperty("uuid");
    expect(msg).toHaveProperty("message");
    expect(msg.message.path).toBe("ping");
});
