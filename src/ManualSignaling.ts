import { SignalingInterface, SignalingDataInterface } from './SignalingInterface'

export class ManualSignaling implements SignalingInterface {
  public textToSend: string = ''
  private onInitiateOfferCallback?: (offerId: string) => void
  private onIncomingDataCallback?: (data: SignalingDataInterface) => void
  private onOutgoingDataCallback?: (message: string) => void
  private onWebRtcConnectionErrorCallback?: (id: string) => void
  private readonly id?: string

  constructor () {
    this.id = this.uuid()
  }

  prepare (): Promise<void> {
    // Instant ready
    return new Promise<void>((resolve) => {
      resolve()
    })
  }

  send (to: string, data: SignalingDataInterface): void {
    data.id = to
    this.textToSend = JSON.stringify(data)
    if (this.onOutgoingDataCallback) {
      this.onOutgoingDataCallback(this.textToSend)
    }
  }

  applyRemoteResponse (data: SignalingDataInterface): void {
    if (this.onIncomingDataCallback) {
      this.onIncomingDataCallback(data)
    }
  }

  bindOnIncomingDataCallback (callback: (data: SignalingDataInterface) => void): void {
    this.onIncomingDataCallback = callback
  }

  bindOnOutgoingDataCallback (callback: (message: string) => void): void {
    this.onOutgoingDataCallback = callback
  }

  bindInitiateOfferCallback (callback: (offerId: string) => void): void {
    this.onInitiateOfferCallback = callback
  }

  bindOnWebRtcConnectionErrorCallback (callback: (id: string) => void): void {
    this.onWebRtcConnectionErrorCallback = callback
  }

  getId (): string {
    return this.id!
  }

  initiate (): void {
    this.onInitiateOfferCallback!(this.id!)
  }

  onWebRtcConnectionError (id: string): void {
    if (this.onWebRtcConnectionErrorCallback) {
      this.onWebRtcConnectionErrorCallback(id)
    }
  }

  private uuid (): string {
    let s4 = () => {
      return Math.floor(Math.random() * 0x10000).toString(16)
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
  }
}
