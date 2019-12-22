import { SignalingInterface, SignalingDataInterface } from './SignalingInterface';

export class LocalSignaling implements SignalingInterface {
  private onInitiateOfferCallback?: (offerId: string) => void;
  private onIncomingDataCallback?: (data: SignalingDataInterface) => void;
  private onWebRtcConnectionErrorCallback?: (id: string) => void;

  public prepare(): Promise<void> {
    // Instant ready
    return new Promise<void>(resolve => {
      resolve();
    });
  }

  public send(to: string, data: SignalingDataInterface): void {
    // Swap offers and answers
    const answerRe = /connection-answer-(\d+)/;
    const offerRe = /connection-offer-(\d+)/;
    const answerMatch = answerRe.exec(to);
    const offerMatch = offerRe.exec(to);
    if (answerMatch && answerMatch[1]) {
      data.id = 'connection-offer-' + answerMatch[1];
    } else if (offerMatch && offerMatch[1]) {
      data.id = 'connection-answer-' + offerMatch[1];
    }

    if (this.onIncomingDataCallback) {
      this.onIncomingDataCallback(data);
    }
  }

  public bindOnIncomingDataCallback(callback: (data: SignalingDataInterface) => void): void {
    this.onIncomingDataCallback = callback;
  }

  public bindInitiateOfferCallback(callback: (offerId: string) => void): void {
    this.onInitiateOfferCallback = callback;
  }

  public bindOnWebRtcConnectionErrorCallback(callback: (id: string) => void): void {
    this.onWebRtcConnectionErrorCallback = callback;
  }

  public getId(): string {
    return 'does-not-matter';
  }

  public initiate(connectionsNum = 1): void {
    if (this.onInitiateOfferCallback) {
      for (let i = 1; i <= connectionsNum; i += 1) {
        this.onInitiateOfferCallback('connection-answer-' + i);
      }
    }
  }

  public onWebRtcConnectionError(id: string): void {
    if (this.onWebRtcConnectionErrorCallback) {
      this.onWebRtcConnectionErrorCallback(id);
    }
  }
}
