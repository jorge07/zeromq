import Req from "../../../../src/Transport/Patterns/Req-Rep/Req";
import Rep from "../../../../src/Transport/Patterns/Req-Rep/Rep";
import {Request} from "../../../../src/Message/Request";

const ADDRESS = "tcp://127.0.0.1:1212";
const ADDRESS_1 = "tcp://127.0.0.1:1213";

const startRep: (address: string) => Rep = (address: string): Rep => {
    const rep = new Rep(address);

    rep.start((request: Request) => {

        switch (request.path) {
            case 'ping':
                return {
                    code: 0
                }
        }

        return {
            code: 404
        }
    });

    return rep;
};

it("Send a clientRequest and receive a clientResponse", async () => {
    const req = new Req([ADDRESS]);
    const rep =  startRep(ADDRESS);

    return req
        .start()
        .then(async () => expect(
            req
                .request({path: "test"}))
            .resolves
            .toEqual({ code: 404 }))
        .then(() => {
            req.stop();
            rep.stop();
        });
});

it("Send a clientRequest a timeout", async () => {
    const req = new Req([ADDRESS_1], 200);

    return expect(req.request({path: "timeout"}))
        .rejects
        .toEqual("timeout")
        .then(() => {
            req.stop();
        });
});
