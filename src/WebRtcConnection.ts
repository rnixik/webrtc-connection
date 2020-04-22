import { SignalingInterface, SignalingDataInterface } from './SignalingInterface';

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

export class WebRtcConnection {
  private peers: {
    [key: string]: {
      candidateCache: RTCIceCandidate[];
      connection?: RTCPeerConnection;
      channel?: RTCDataChannel;
      wasSuccess?: boolean;
    };
  } = {};
  private signaling: SignalingInterface;
  private readonly rtcConfig?: object;
  private onOpenCallbacks: (() => void)[] = [];
  private onMessageCallbacks: ((message: string, peerId: string) => void)[] = [];
  private onCloseCallbacks: (() => void)[] = [];
  private readonly id: string;
  private readonly useFraming: boolean = false;
  private framedPool: Map<string, FramedMessage[]> = new Map();
  private framedTimeouts: Map<string, number> = new Map();
  private framesTimeoutValue = 5000;
  private maxMessageSizeForFrame: number = 15 * 1024;

  constructor(signaling: SignalingInterface, iceServers: object[] = [], useFraming: boolean = false) {
    this.signaling = signaling;
    this.signaling.bindInitiateOfferCallback(offerId => {
      this.initiateOffer(offerId);
    });
    this.signaling.bindOnIncomingDataCallback((data: SignalingDataInterface) => {
      this.applyRemote(data);
    });

    this.useFraming = useFraming;

    this.id = signaling.getId();

    if (iceServers.length === 0) {
      iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
    }

    this.rtcConfig = {
      iceServers: iceServers,
    };
  }

  public initiateOffer(id: string, channelName = 'some-channel'): void {
    this.peers[id] = {
      candidateCache: [],
    };

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.initConnection(pc, id);
    this.peers[id].connection = pc;
    const channel = pc.createDataChannel(channelName);
    this.peers[id].channel = channel;
    this.bindChannelEvents(id, channel);

    pc.onnegotiationneeded = async (): Promise<void> => {
      await pc.setLocalDescription(await pc.createOffer());
    };
  }

  public sendMessage(message: string): void {
    this.splitMessageToFrames(message).then((preparedMessage) => {
      for (const peer in this.peers) {
        const channel = this.peers[peer].channel;
        if (channel !== undefined) {
          channel.send(preparedMessage);
        }
      }
    });
  }

  public close(): void {
    for (const peer in this.peers) {
      const channel = this.peers[peer].channel;
      if (channel !== undefined) {
        try {
          channel.close();
        } catch (e) {
          // Nothing to do
        }
      }
    }
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

  private async applyRemote(data: SignalingDataInterface): Promise<void> {
    if (data.sdp.type === 'answer') {
      await this.remoteAnswerReceived(data.id, data.sdp);
    } else {
      await this.remoteOfferReceived(data.id, data.sdp);
    }

    for (let i = 0; i < data.ice.length; i++) {
      this.remoteCandidateReceived(data.id, data.ice[i]);
    }
  }

  private initConnection(pc: RTCPeerConnection, id: string): void {
    pc.onicecandidate = (event): void => {
      if (!pc.localDescription) {
        return
      }

      if (event.candidate) {
        this.peers[id].candidateCache.push(event.candidate);
      } else {
        const data = {
          id: this.id,
          sdp: pc.localDescription,
          ice: this.peers[id].candidateCache,
        };

        this.signaling.send(id, data);
      }
    };

    pc.oniceconnectionstatechange = (): void => {
      switch (pc.iceConnectionState) {
        case 'failed':
          // Firefox
          if (this.peers[id].wasSuccess) {
            for (const callback of this.onCloseCallbacks) {
              callback();
            }
          }
          this.signaling.onWebRtcConnectionError(id);
          delete this.peers[id];
          break;
      }
    };

    pc.onconnectionstatechange = (): void => {
      switch (pc.connectionState) {
        case 'disconnected':
          // Chrome
          if (this.peers[id].wasSuccess) {
            for (const callback of this.onCloseCallbacks) {
              callback();
            }
          }
          this.signaling.onWebRtcConnectionError(id);
          delete this.peers[id];
          break;
      }
    };
  }

  private bindChannelEvents(id: string, channel: RTCDataChannel): void {
    channel.onopen = (): void => {
      this.peers[id].wasSuccess = true;
      for (const callback of this.onOpenCallbacks) {
        callback();
      }
    };
    channel.onclose = (): void => {
      // Nothing to do
    };
    channel.onmessage = (e): void => {
      this.prepareIncomingMessage(e.data).then((message) => {
        if (typeof message === 'undefined') {
          return;
        }

        for (const callback of this.onMessageCallbacks) {
          callback(message, id);
        }
      })
    };
  }

  private async remoteOfferReceived(remoteId: string, sdp: RTCSessionDescription): Promise<void> {
    this.createConnection(remoteId);
    const pc = this.peers[remoteId].connection;
    if (!pc) {
      return;
    }

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  }

  private async remoteAnswerReceived(id: string, sdp: RTCSessionDescription): Promise<void> {
    this.createConnection(id);
    const pc = this.peers[id].connection;
    if (!pc) {
      return;
    }
    await pc.setRemoteDescription(sdp);
  }

  private async remoteCandidateReceived(id: string, ice: RTCIceCandidate): Promise<void> {
    const pc = this.peers[id].connection;
    if (!pc) {
      return;
    }
    await pc.addIceCandidate(ice);
  }

  private createConnection(id: string): void {
    if (this.peers[id] === undefined) {
      this.peers[id] = {
        candidateCache: [],
      };
      const pc = new RTCPeerConnection(this.rtcConfig);
      this.initConnection(pc, id);

      this.peers[id].connection = pc;
      pc.ondatachannel = (e): void => {
        this.peers[id].channel = e.channel;
        this.bindChannelEvents(id, e.channel);
      };
    }
  }

  private async splitMessageToFrames(message: string): Promise<string[]> {
    if (!this.useFraming) {
      return [message];
    }
    const framedMessages: string[] = [];
    const id = '' + Math.floor(Math.random() * 100000000)
    const messageBlob = new Blob([message]);
    const messageSize = messageBlob.size;
    const framesNumber = Math.ceil(messageSize / this.maxMessageSizeForFrame);
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

  private async prepareIncomingMessage(message: string): Promise<string | undefined> {
    if (!this.useFraming) {
      return message;
    }

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
