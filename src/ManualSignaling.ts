import { SignalingInterface, SignalingDataInterface } from './SignalingInterface';
import { uuid } from "./utils/uuid";

export class ManualSignaling implements SignalingInterface {
  public textToSend = '';
  private onInitiateOfferCallback?: (offerId: string) => void;
  private onIncomingDataCallback?: (data: SignalingDataInterface) => void;
  private onOutgoingDataCallback?: (message: string) => void;
  private onWebRtcConnectionErrorCallback?: (id: string) => void;
  private readonly id: string;

  constructor() {
    this.id = uuid();
  }

  public prepare(): Promise<void> {
    // Instant ready
    return new Promise<void>(resolve => {
      resolve();
    });
  }

  public send(to: string, data: SignalingDataInterface): void {
    data.id = to;
    this.textToSend = JSON.stringify(data);
    if (this.onOutgoingDataCallback) {
      this.onOutgoingDataCallback(this.textToSend);
    }
  }

  public applyRemoteResponse(data: SignalingDataInterface): void {
    if (this.onIncomingDataCallback) {
      this.onIncomingDataCallback(data);
    }
  }

  public bindOnIncomingDataCallback(callback: (data: SignalingDataInterface) => void): void {
    this.onIncomingDataCallback = callback;
  }

  public bindOnOutgoingDataCallback(callback: (message: string) => void): void {
    this.onOutgoingDataCallback = callback;
  }

  public bindInitiateOfferCallback(callback: (offerId: string) => void): void {
    this.onInitiateOfferCallback = callback;
  }

  public bindOnWebRtcConnectionErrorCallback(callback: (id: string) => void): void {
    this.onWebRtcConnectionErrorCallback = callback;
  }

  public getId(): string {
    return this.id;
  }

  public initiate(): void {
    if (this.onInitiateOfferCallback) {
      this.onInitiateOfferCallback(this.id);
    }
  }

  public onWebRtcConnectionError(id: string): void {
    if (this.onWebRtcConnectionErrorCallback) {
      this.onWebRtcConnectionErrorCallback(id);
    }
  }
}
