import { SignalingInterface, SignalingDataInterface } from './SignalingInterface';
import io from 'socket.io-client';
import { uuid } from "./utils/uuid";

export class SocketIoSignaling implements SignalingInterface {
  private onIncomingDataCallback?: (data: SignalingDataInterface) => void;
  private onInitiateOfferCallback?: (offerId: string) => void;
  private onWebRtcConnectionErrorCallback?: (id: string) => void;
  private socket?: SocketIOClient.Socket;
  private readonly id: string;
  private readonly address: string;
  private readonly room: string;

  constructor(address: string, room: string) {
    this.address = address;
    this.room = room;
    this.id = uuid();
  }

  prepare(): Promise<void> {
    this.socket = io(this.address);
    this.socket.on('webrtc', (message: string) => {
      const socketData: SignalingDataInterface = JSON.parse(message).data;
      if (this.onIncomingDataCallback) {
        this.onIncomingDataCallback(socketData);
      }
    });
    this.socket.on('new', (remoteId: string) => {
      if (this.onInitiateOfferCallback) {
        this.onInitiateOfferCallback(remoteId);
      }
    });

    const socket = this.socket;
    const id = this.id;
    const room = this.room;

    return new Promise<void>(resolve => {
      socket.on('connect', () => {
        resolve();
        socket.emit('room', JSON.stringify({ id: id, room: room }));
      });
    });
  }

  send(to: string, data: SignalingDataInterface): void {
    if (!this.socket) {
      return;
    }
    this.socket.emit('webrtc', JSON.stringify({ id: data.id, to: to, data: data }));
  }

  bindOnIncomingDataCallback(callback: (socketData: SignalingDataInterface) => void): void {
    this.onIncomingDataCallback = callback;
  }

  bindInitiateOfferCallback(callback: (offerId: string) => void): void {
    this.onInitiateOfferCallback = callback;
  }

  bindOnWebRtcConnectionErrorCallback(callback: (id: string) => void): void {
    this.onWebRtcConnectionErrorCallback = callback;
  }

  getId(): string {
    return this.id;
  }

  onWebRtcConnectionError(id: string): void {
    if (this.onWebRtcConnectionErrorCallback) {
      this.onWebRtcConnectionErrorCallback(id);
    }
  }
}
