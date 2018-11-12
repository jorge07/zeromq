import envelop from "../../src/Message/Envelop";
import { Request } from "../../src/Message/Request";
import Buffer from "../../src/Transport/Buffer";

it("should convert Object into buffer and buffer into string", () => {
    const buf: Buffer = Buffer.from(envelop<Request>({ path: "ping" }));

    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString()).toContain("ping");
    expect(buf.toString()).toContain("ping");
    expect(buf.toString()).toContain("timeout");
});
