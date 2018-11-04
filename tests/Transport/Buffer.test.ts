import envelop from "../../src/Message/Envelop";
import {Request} from "../../src/Message/Request";
import Buffer from "../../src/Transport/Buffer";

it("should convert into buffer", () => {
    const buf: Buffer = Buffer.from(envelop<Request>({ path: "ping" }));

    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString()).toContain("ping");
});
