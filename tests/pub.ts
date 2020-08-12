import { Publisher } from "../src/Transport/Patterns/Pub-Sub/Publisher";

const pub: Publisher = new Publisher(
    "tcp://127.0.0.1:3000",
);

((): void => {
    const loop = (): void => {
        pub.publish({
            path: "demo",
        });
    };

    setInterval(loop, 1000);
})();
