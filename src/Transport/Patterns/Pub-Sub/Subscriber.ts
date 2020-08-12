import { socket, Socket } from "zeromq";

export class Subscriber {
    private readonly connection: Socket;
    private addresses: string[] = [];

    constructor(addresses: string[], options = {}) {
        this.connection = socket("sub", options);
        this.addresses = addresses;
        this.addresses.forEach(this.connect.bind(this));
    }

    private connect(address: string): void {
        this.connection.connect(address);
    }

    private disconnect(address: string): void {
        this.connection.disconnect(address);
    }

    private subscribe(topicSubscription: string = "", action: (topicName: string, ...buffer: any[]) => void): void {
        this.connection.subscribe(topicSubscription);
        this.connection.on(
            "message",
            (topicNameBuffer: Buffer, ...buffer: Buffer[]): void => {
                action(
                    topicNameBuffer.toString(),
                    ...buffer.map((value) => {
                        try {
                            return JSON.parse(value.toString());
                        } catch (e) {
                            return value.toString();
                        }
                    }),
                );
            },
        );
    }

    private newAddresses(list: string[]): string[] {
        return list.filter((value) => !this.addresses.includes(value));
    }

    private removedAddresses(list: string[]): string[] {
        return this.addresses.filter((value) => !list.includes(value));
    }

    public refreshClients(addresses: string[]): void {
        const newPublishers: string[] = this.newAddresses(addresses);
        const removedPublishers: string[] = this.removedAddresses(addresses);

        newPublishers.forEach(this.connect.bind(this));
        removedPublishers.forEach(this.disconnect.bind(this));

        this.addresses = addresses;
    }

    public publishers(): number {
        return this.addresses.length;
    }

    public attach(topic: string, action: (topic: string, ...buffer: any[]) => void): void {
        this.subscribe(topic, action);
    }

    public stop(): void {
        this.connection.close();
    }
}
