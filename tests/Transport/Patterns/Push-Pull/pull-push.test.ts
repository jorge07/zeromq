import { Push } from "../../../../src/Transport/Patterns/Push-Pull/Push";
import { Pull } from "../../../../src/Transport/Patterns/Push-Pull/Pull";

const PUB_ADDRESS_1 = "tcp://127.0.0.1:4433";
const PUB_ADDRESS_4 = "tcp://127.0.0.1:2222";
const PUB_ADDRESS_2 = "tcp://127.0.0.1:5533";
const PUB_ADDRESS_2_2 = "tcp://127.0.0.1:5534";
const PUB_ADDRESS_3 = "tcp://127.0.0.1:9953";
const PUB_ADDRESS_3_3 = "tcp://127.0.0.1:9954";

const startPusher = (address: string): Push => new Push(address);

it("Pull should receive a message from the pusher", async () => {
    const pull = new Pull([PUB_ADDRESS_1]);
    const push = startPusher(PUB_ADDRESS_1);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {
        const timer = setTimeout(
            () => {
                push.stop();
                pull.stop();
                reject("Timeout");
            },
            2000,
        );

        pull
            .attach((msg) => {
                expect(msg).toEqual({ path: "test", body: "demo" });
                clearTimeout(timer);

                push.stop();
                pull.stop();

                resolve(true);
            });

        setTimeout(
            () => {
                push.publish({ path: "test", body: "demo" });
            },
            200,
        );
    });
});

it("Pull should receive a message from the pushers", async () => {
    const pull = new Pull([PUB_ADDRESS_2, PUB_ADDRESS_2_2]);
    const push = startPusher(PUB_ADDRESS_2);
    const push2 = startPusher(PUB_ADDRESS_2_2);

    expect(pull.publishers()).toBe(2);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {

        const ok: number[] = [];
        const isSuccess = () => {
            if (ok.length === 2) {
                resolve();
                clean();
            }
        };

        const timer = setTimeout(
            () => {
                push.stop();
                push2.stop();
                pull.stop();
                reject("Timeout");
            },
            500);

        const clean = () => {
            clearTimeout(timer);
            push.stop();
            push2.stop();
            pull.stop();
        };

        pull
            .attach((msg) => {
                expect([{ path: "test", body: "test" }, { path: "demo", body: "demo" }]).toContainEqual(msg);
                ok.push(1);
                isSuccess();
            });

        setTimeout(
            () => {
                push.publish({ path: "test", body: "test" });
                push2.publish({ path: "demo", body: "demo" });
            },
            200,
        );
    });
});

it("Must fire a timeout error when not enough messages", async () => {
    const pull = new Pull([PUB_ADDRESS_3, PUB_ADDRESS_3_3]);
    const push = startPusher(PUB_ADDRESS_3);
    const push2 = startPusher(PUB_ADDRESS_3_3);

    expect(pull.publishers()).toBe(2);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {

        const ok: number[] = [];
        const isSuccess = () => {
            if (ok.length === 2) {
                reject();
                clean();
            }
        };

        const timer = setTimeout(() => {
            push.stop();
            push2.stop();
            pull.stop();
            resolve("Timeout");
        },                       500);

        const clean = () => {
            clearTimeout(timer);
            push.stop();
            push2.stop();
            pull.stop();
        };

        pull
            .attach((msg) => {
                expect([{ path: "test", body: "test" }, { path: "demo", body: "demo" }]).toContainEqual(msg);
                ok.push(1);
                isSuccess();
            });

        setTimeout(
            () => {
                push2.publish({ path: "demo", body: "demo" });
            },
            200);
    });
});

it("Pusher should round robin", async () => {
    const pull = new Pull([PUB_ADDRESS_4]);
    const pull2 = new Pull([PUB_ADDRESS_4]);
    const pull3 = new Pull([PUB_ADDRESS_4]);
    const push = startPusher(PUB_ADDRESS_4);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {
        const timer = setTimeout(
            () => {
                push.stop();
                pull.stop();
                pull2.stop();
                reject("Timeout");
            },
            2000,
        );

        const ok: any = {};

        const hasSuccess = (from: string) => {
            ok[from] = true;

            if (Object.keys(ok).length === 3) {
                resolve(true);
            }
        };

        pull
            .attach((msg) => {
                expect(msg).toEqual({ path: "test", body: "demo" });
                clearTimeout(timer);

                hasSuccess("1");
            });

        pull2
            .attach((msg) => {
                expect(msg).toEqual({ path: "test", body: "demo" });
                clearTimeout(timer);

                hasSuccess("2");
            });

        pull3
            .attach((msg) => {
                expect(msg).toEqual({ path: "test", body: "demo" });
                clearTimeout(timer);

                hasSuccess("3");
            });

        setTimeout(
            () => {
                push.publish({ path: "test", body: "demo" });
                push.publish({ path: "test", body: "demo" });
                push.publish({ path: "test", body: "demo" });
            },
            200,
        );
    });
});
