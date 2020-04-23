class FramedMessage {
    public id: string;
    public framesNumber: number;
    public currentFrame: number;
    public data: string;

    constructor (id: string, framesNumber: number, currentFrame: number, data: string) {
        this.id = id;
        this.framesNumber = framesNumber;
        this.currentFrame = currentFrame;
        this.data = data;
    }
}

export class MessageFramer {
    private framedPool: Map<string, FramedMessage[]> = new Map();
    private framedTimeouts: Map<string, number> = new Map();
    private framesTimeoutValue = 5000;

    public async splitMessageToFrames(message: string, maxMessageSizeForFrame: number): Promise<string[]> {
        const framedMessages: string[] = [];
        const id = '' + Math.floor(Math.random() * 100000000)
        const messageBlob = new Blob([message]);
        const messageSize = messageBlob.size;
        const framesNumber = Math.ceil(messageSize / maxMessageSizeForFrame);
        const frameSize = Math.floor(messageSize / framesNumber)
        for (let currentFrame = 1; currentFrame <= framesNumber; currentFrame += 1) {
            const frameData = messageBlob.slice((currentFrame - 1) * frameSize, frameSize)
            const framedMessage = new FramedMessage(
                id,
                framesNumber,
                currentFrame,
                await frameData.text()
            );
            framedMessages.push(JSON.stringify(framedMessage));
        }

        return framedMessages;
    }

    public async prepareIncomingMessage(message: string): Promise<string | undefined> {
        const framedMessage = (JSON.parse(message) as FramedMessage);

        this.framedTimeouts.set(framedMessage.id, setTimeout(() => {
            this.framedPool.delete(framedMessage.id)
        }, this.framesTimeoutValue));

        if (!this.framedPool.has(framedMessage.id)) {
            this.framedPool.set(framedMessage.id, []);
        }

        const frames = this.framedPool.get(framedMessage.id);
        if (frames) {
            frames.push(framedMessage);
            if (framedMessage.framesNumber === frames.length) {
                const blobParts = [];
                for (const framedMessage of frames) {
                    blobParts.push(framedMessage.data);
                }

                const blob = new Blob(blobParts);

                return await blob.text()
            }
        }

        // Awaiting other parts

        return undefined;
    }
}