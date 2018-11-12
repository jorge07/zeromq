import { Request } from "../../../../src/Message/Request";
import Req from "../../../../src/Transport/Patterns/Req-Rep/Req";
import Rep from "../../../../src/Transport/Patterns/Req-Rep/Rep";

const ADDRESS = "tcp://127.0.0.1:4444";
const rep = new Rep(ADDRESS);
const req = new Req([ADDRESS]);

beforeEach(async () => {
    rep.start((request: Request) => {
        switch (request.path) {
            case "test":
                return {
                    body: "ok",
                    code: 0,
                };
            default:
                return {
                    code: 1,
                };
        }
    });

    await req.start();
});

afterEach(() => {
    rep.stop();
    req.stop();
});

it("Send a request and receive a response", async () => {
    return expect(req.request({path: "test"})).resolves.toEqual({body: "ok", code: 0});
});
