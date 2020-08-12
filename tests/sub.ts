import { Subscriber } from "../src/Transport/Patterns/Pub-Sub/Subscriber";
import { format } from "util";

const subs: Subscriber = new Subscriber([
    "tcp://127.0.0.1:3000",
]);

subs.attach("demo", (topic: string, ...msg: any[]) => {
    process.stdout.write(format(msg));

    process.stdout.write("\n");
});
