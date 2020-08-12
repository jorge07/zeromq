import { Publisher } from "../../../../src/Transport/Patterns/Pub-Sub/Publisher";
import { Subscriber } from "../../../../src/Transport/Patterns/Pub-Sub/Subscriber";

const PUB_ADDRESS_1 = "tcp://127.0.0.1:4444";
const PUB_ADDRESS_2 = "tcp://127.0.0.1:5553";
const PUB_ADDRESS_2_2 = "tcp://127.0.0.1:5554";
const PUB_ADDRESS_3 = "tcp://127.0.0.1:3353";
const PUB_ADDRESS_3_3 = "tcp://127.0.0.1:3354";

const startPublisher = (address: string): Publisher => new Publisher(address);

it("Subscriber should receive a message from the publisher", async () => {
    const sub = new Subscriber([PUB_ADDRESS_1]);
    const pub = startPublisher(PUB_ADDRESS_1);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {
        const timer = setTimeout(
            () => {
                pub.stop();
                sub.stop();
                reject("Timeout");
            },
            2000,
        );

        sub
            .attach("test", async (topic, msg) => {
                expect(topic).toBe("test");
                expect(msg).toEqual({ path: "test", body: "demo" });
                clearTimeout(timer);

                pub.stop();
                sub.stop();

                return resolve(true);
            });

        setTimeout(
            () => {
                pub.publish({ path: "test", body: "demo" });
            },
            200,
        );
    });
});

it("Subscriber should receive a message from the publishers", async () => {
    const sub = new Subscriber([PUB_ADDRESS_2, PUB_ADDRESS_2_2]);
    const pub = startPublisher(PUB_ADDRESS_2);
    const pub2 = startPublisher(PUB_ADDRESS_2_2);

    expect(sub.publishers()).toBe(2);

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
                pub.stop();
                pub2.stop();
                sub.stop();
                reject("Timeout");
            },
            500);

        const clean = () => {
            clearTimeout(timer);
            pub.stop();
            pub2.stop();
            sub.stop();
        };

        sub
            .attach("", (topic, msg) => {
                expect(["test", "demo"]).toContain(topic);
                expect([{ path: "test", body: "test" }, { path: "demo", body: "demo" }]).toContainEqual(msg);
                ok.push(1);
                isSuccess();
            });

        setTimeout(
            () => {
                pub.publish({ path: "test", body: "test" });
                pub2.publish({ path: "demo", body: "demo" });
            },
            200,
        );
    });
});

it("Must fire a timeout error when not enough messages", async () => {
    const sub = new Subscriber([PUB_ADDRESS_3, PUB_ADDRESS_3_3]);
    const pub = startPublisher(PUB_ADDRESS_3);
    const pub2 = startPublisher(PUB_ADDRESS_3_3);

    expect(sub.publishers()).toBe(2);

    return new Promise((resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => {

        const ok: number[] = [];
        const isSuccess = () => {
            if (ok.length === 2) {
                reject();
                clean();
            }
        };

        const timer = setTimeout(() => {
            pub.stop();
            pub2.stop();
            sub.stop();
            resolve("Timeout");
        },                       500);

        const clean = () => {
            clearTimeout(timer);
            pub.stop();
            pub2.stop();
            sub.stop();
        };

        sub
            .attach("", (topic, msg) => {
                expect(["test", "demo"]).toContain(topic);
                expect([{ path: "test", body: "test" }, { path: "demo", body: "demo" }]).toContainEqual(msg);
                ok.push(1);
                isSuccess();
            });

        setTimeout(
            () => {
                pub2.publish({ path: "demo", body: "demo" });
            },
            200);
    });
});
