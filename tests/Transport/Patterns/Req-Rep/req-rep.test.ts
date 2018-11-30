import Req from "../../../../src/Transport/Patterns/Req-Rep/Req";
import Rep from "../../../../src/Transport/Patterns/Req-Rep/Rep";

const ADDRESS = "tcp://127.0.0.1:1212";
const ADDRESS_1 = "tcp://127.0.0.1:1213";

const startRep: (address: string) => Rep = (address: string): Rep => {
    const rep = new Rep(address);

    rep.start(() => ({ code: 1 }));

    return rep;
};

it("Send a request and receive a response", async () => {
    const req = new Req([ADDRESS]);
    const rep =  startRep(ADDRESS);

    return req
        .start()
        .then(async () => expect(
            req
                .request({path: "test"}))
            .resolves
            .toEqual({ code: 1 }))
        .then(() => {
            req.stop();
            rep.stop();
        });
});

it("Send a request a timeout", async () => {
    const req = new Req([ADDRESS_1], 200);

    return expect(req.request({path: "timeout"}))
        .rejects
        .toEqual("timeout")
        .then(() => {
            req.stop();
        });
});
