import { SignalingInterface } from './SignalingInterface';
import { WebRtcConnection } from './WebRtcConnection';

export class WebRtcConnectionsPool {
  private pool: WebRtcConnection[] = [];
  private onOpenCallbacks: (() => void)[] = [];
  private onMessageCallbacks: ((message: string, peerId: string) => void)[] = [];
  private onCloseCallbacks: (() => void)[] = [];
  private readonly useFraming: boolean;

  constructor(useFraming: boolean = false) {
    this.useFraming = useFraming;
  }

  public connect(signaling: SignalingInterface): WebRtcConnection {
    const connection = new WebRtcConnection(signaling, [], this.useFraming);

    connection.addOnOpenCallback(() => {
      this.onOpen();
    });
    connection.addOnMessageCallback((message: string, peerId: string) => {
      this.onMessage(message, peerId);
    });
    connection.addOnCloseCallback(() => {
      this.onClose();
    });

    this.pool.push(connection);

    return connection;
  }

  public addOnOpenCallback(callback: () => void): void {
    this.onOpenCallbacks.push(callback);
  }

  public addOnMessageCallback(callback: (message: string, peerId: string) => void): void {
    this.onMessageCallbacks.push(callback);
  }

  public addOnCloseCallback(callback: () => void): void {
    this.onCloseCallbacks.push(callback);
  }

  public sendMessage(message: string): void {
    for (const connection of this.pool) {
      connection.sendMessage(message);
    }
  }

  public close(): void {
    for (const connection of this.pool) {
      connection.close();
    }
  }

  private onOpen(): void {
    for (const callback of this.onOpenCallbacks) {
      callback();
    }
  }

  private onMessage(message: string, peerId: string): void {
    for (const callback of this.onMessageCallbacks) {
      callback(message, peerId);
    }
  }

  private onClose(): void {
    for (const callback of this.onCloseCallbacks) {
      callback();
    }
  }
}
