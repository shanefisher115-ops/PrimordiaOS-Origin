import net from "net";

export class UnrealRPCClient {
    sendPython(cmd: any): Promise<any> {
        return new Promise(resolve => {
            const client = new net.Socket();
            client.connect(7777, "127.0.0.1", () => {
                client.write(JSON.stringify(cmd));
            });

            client.on("data", data => {
                resolve(JSON.parse(data.toString()));
                client.destroy();
            });
        });
    }

    sendCpp(cmd: any): Promise<any> {
        return new Promise(resolve => {
            const client = new net.Socket();
            client.connect(7778, "127.0.0.1", () => {
                client.write(JSON.stringify(cmd));
            });

            client.on("data", data => {
                resolve(JSON.parse(data.toString()));
                client.destroy();
            });
        });
    }
}
