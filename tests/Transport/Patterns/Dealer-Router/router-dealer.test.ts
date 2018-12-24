import { Request } from "../../../../src/Message/Request";
import Dealer from "../../../../src/Transport/Patterns/Dealer-Router/Dealer";
import Router from "../../../../src/Transport/Patterns/Dealer-Router/Router";

const ADDRESS = "tcp://127.0.0.1:5544";
const router = new Router(ADDRESS);
const dealer = new Dealer([ADDRESS]);

beforeEach(async () => {
    router.start((request: Request) => {
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

    await dealer.start();
});

afterEach(() => {
    router.stop();
    dealer.stop();
});

it("Send a clientRequest and receive a clientResponse", async () => {
    return expect(dealer.request({path: "test"})).resolves.toEqual({body: "ok", code: 0});
});
