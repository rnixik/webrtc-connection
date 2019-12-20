import { SignalingInterface, SignalingDataInterface } from './SignalingInterface'
import io from 'socket.io-client'

export class SocketIoSignaling implements SignalingInterface {
  private onIncomingDataCallback?: ((data: SignalingDataInterface) => void)
  private onInitiateOfferCallback?: ((offerId: string) => void)
  private onWebRtcConnectionErrorCallback?: (id: string) => void
  private socket? : SocketIOClient.Socket
  private readonly id : string
  private readonly address : string
  private readonly room : string

  constructor (address: string, room: string) {
    this.address = address
    this.room = room
    this.id = this.uuid()
  }

  prepare (): Promise<void> {
    this.socket = io(this.address)
    this.socket.on('webrtc', (message: string) => {
      const socketData: SignalingDataInterface = JSON.parse(message).data
      this.onIncomingDataCallback!(socketData)
    })
    this.socket.on('new', (remoteId: string) => {
      this.onInitiateOfferCallback!(remoteId)
    })

    const socket = this.socket
    const id = this.id
    const room = this.room

    return new Promise<void>((resolve) => {
      socket.on('connect', () => {
        resolve()
        socket.emit('room', JSON.stringify({ id: id, room: room }))
      })
    })
  }

  send (to: string, data: SignalingDataInterface): void {
    this.socket!.emit('webrtc', JSON.stringify({ id: data.id, to: to, data: data }))
  }

  bindOnIncomingDataCallback (callback: (socketData: SignalingDataInterface) => void): void {
    this.onIncomingDataCallback = callback
  }

  bindInitiateOfferCallback (callback: (offerId: string) => void): void {
    this.onInitiateOfferCallback = callback
  }

  bindOnWebRtcConnectionErrorCallback (callback: (id: string) => void): void {
    this.onWebRtcConnectionErrorCallback = callback
  }

  getId (): string {
    return this.id
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
