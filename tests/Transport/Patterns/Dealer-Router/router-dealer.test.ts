import {Request} from "../../../../src/Message/Request";
import Dealer from "../../../../src/Transport/Patterns/Dealer-Router/Dealer";
import Router from "../../../../src/Transport/Patterns/Dealer-Router/Router";

const ADDRESS = "tcp://127.0.0.1:5555";
const router = new Router(ADDRESS);
const dealer = new Dealer([ADDRESS]);

beforeEach(async () => {
    router.start((request: Request) => {
        switch (request.path) {
            case "test":
                return {
                    body: "oK",
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

it("Send a request and receive a response", () => {
    return expect(dealer.request({path: "test"})).resolves.toEqual( {body: "oK", code: 0});
});
