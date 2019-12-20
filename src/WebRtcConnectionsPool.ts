import { SignalingInterface } from './SignalingInterface'
import { WebRtcConnection } from './WebRtcConnection'

export class WebRtcConnectionsPool {
  private pool: WebRtcConnection[] = []
  private onOpenCallbacks: CallableFunction[] = [];
  private onMessageCallbacks: CallableFunction[] = [];
  private onCloseCallbacks: CallableFunction[] = [];

  public connect (signaling: SignalingInterface): WebRtcConnection {
    const connection = new WebRtcConnection(signaling)

    connection.addOnOpenCallback(() => {
      this.onOpen()
    })
    connection.addOnMessageCallback((message: string) => {
      this.onMessage(message)
    })
    connection.addOnCloseCallback(() => {
      this.onClose()
    })

    this.pool.push(connection)

    return connection
  }

  public addOnOpenCallback (callback: () => void): void {
    this.onOpenCallbacks.push(callback)
  }

  public addOnMessageCallback (callback: (message: string) => void): void {
    this.onMessageCallbacks.push(callback)
  }

  public addOnCloseCallback (callback: () => void): void {
    this.onCloseCallbacks.push(callback)
  }

  public sendMessage (message: string): void {
    for (let connection of this.pool) {
      connection.sendMessage(message)
    }
  }

  public close (): void {
    for (let connection of this.pool) {
      connection.close()
    }
  }

  private onOpen (): void {
    for (let callback of this.onOpenCallbacks) {
      callback()
    }
  }

  private onMessage (message: string): void {
    for (let callback of this.onMessageCallbacks) {
      callback(message)
    }
  }

  private onClose (): void {
    for (let callback of this.onCloseCallbacks) {
      callback()
    }
  }
}
