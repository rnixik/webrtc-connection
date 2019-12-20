import { SignalingInterface, SignalingDataInterface } from './SignalingInterface'

export class WebRtcConnection {
  private peers: { [key: string]: {
      candidateCache: RTCIceCandidate[],
      connection?: RTCPeerConnection,
      channel?: RTCDataChannel,
      wasSuccess?: boolean
  }; } = {};
  private signaling: SignalingInterface;
  private rtcConfig?: object;
  private onOpenCallbacks: (() => void)[] = [];
  private onMessageCallbacks: ((message: string) => void)[] = [];
  private onCloseCallbacks: (() => void)[] = [];
  private readonly id: string

  constructor (signaling: SignalingInterface, iceServers: object[] = []) {
    this.signaling = signaling
    this.signaling.bindInitiateOfferCallback((offerId) => {
      this.initiateOffer(offerId)
    })
    this.signaling.bindOnIncomingDataCallback((data: SignalingDataInterface) => {
      this.applyRemote(data)
    })

    this.id = signaling.getId()

    if (iceServers.length === 0) {
      iceServers.push({ urls: 'stun:stun.l.google.com:19302' })
    }

    this.rtcConfig = {
      iceServers: iceServers
    }
  }

  public initiateOffer (id: string): void {
    this.peers[id] = {
      candidateCache: []
    }

    const pc = new RTCPeerConnection(this.rtcConfig)
    this.initConnection(pc, id, 'offer')
    this.peers[id].connection = pc
    const channel = pc.createDataChannel('some-channel')
    this.peers[id].channel = channel
    this.bindChannelEvents(id, channel)

    pc.onnegotiationneeded = async () => {
      await pc.setLocalDescription(await pc.createOffer())
    }
  }

  public sendMessage (message: string) {
    for (let peer in this.peers) {
      if (this.peers.hasOwnProperty(peer)) {
        if (this.peers[peer].channel !== undefined) {
          try {
            this.peers[peer].channel!.send(message)
          } catch (err) {
            // Nothing to do
          }
        }
      }
    }
  }

  public close () {
    for (let peer in this.peers) {
      if (this.peers.hasOwnProperty(peer)) {
        if (this.peers[peer].channel !== undefined) {
          try {
            this.peers[peer].channel!.close()
          } catch (e) {}
        }
      }
    }
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

  private async applyRemote (data: SignalingDataInterface) {
    if (data.sdp.type === 'answer') {
      await this.remoteAnswerReceived(data.id, data.sdp)
    } else {
      await this.remoteOfferReceived(data.id, data.sdp)
    }

    for (let i = 0; i < data.ice.length; i++) {
      this.remoteCandidateReceived(data.id, data.ice[i])
    }
  }

  private initConnection (pc: RTCPeerConnection, id: string, sdpType: 'offer' | 'answer'): void {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.peers[id].candidateCache.push(event.candidate)
      } else {
        const data = {
          id: this.id,
          sdp: pc.localDescription!,
          ice: this.peers[id].candidateCache
        }

        this.signaling!.send(id, data)
      }
    }

    pc.oniceconnectionstatechange = (event) => {
      switch (pc.iceConnectionState) {
        case 'failed':
          // Firefox
          if (this.peers[id].wasSuccess) {
            for (let callback of this.onCloseCallbacks) {
              callback()
            }
          }
          this.signaling.onWebRtcConnectionError(id)
          delete this.peers[id]
          break
      }
    }

    pc.onconnectionstatechange = (event) => {
      switch (pc.connectionState) {
        case 'disconnected':
          // Chrome
          if (this.peers[id].wasSuccess) {
            for (let callback of this.onCloseCallbacks) {
              callback()
            }
          }
          this.signaling.onWebRtcConnectionError(id)
          delete this.peers[id]
          break
      }
    }
  }

  private bindChannelEvents (id: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      this.peers[id].wasSuccess = true
      for (let callback of this.onOpenCallbacks) {
        callback()
      }
    }
    channel.onclose = () => {
      // Nothing to do
    }
    channel.onmessage = (e) => {
      for (let callback of this.onMessageCallbacks) {
        callback(e.data)
      }
    }
  }

  private async remoteOfferReceived (remoteId: string, sdp: RTCSessionDescription) {
    this.createConnection(remoteId)
    const pc = this.peers[remoteId].connection!

    await pc.setRemoteDescription(sdp)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
  }

  private remoteAnswerReceived (id: string, sdp: RTCSessionDescription) {
    this.createConnection(id)
    var pc = this.peers[id].connection!
    pc.setRemoteDescription(sdp)
  }

  private remoteCandidateReceived (id: string, ice: RTCIceCandidate) {
    var pc = this.peers[id].connection!
    pc.addIceCandidate(ice)
  }

  private createConnection (id: string) {
    if (this.peers[id] === undefined) {
      this.peers[id] = {
        candidateCache: []
      }
      const pc = new RTCPeerConnection(this.rtcConfig)
      this.initConnection(pc, id, 'answer')

      this.peers[id].connection = pc
      pc.ondatachannel = (e) => {
        this.peers[id].channel = e.channel
        this.bindChannelEvents(id, this.peers[id].channel!)
      }
    }
  }
}
