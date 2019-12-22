export interface SignalingDataInterface {
  id: string;
  sdp: RTCSessionDescription;
  ice: RTCIceCandidate[];
}

// TODO: Split it into two interfaces
export interface SignalingInterface {
  getId(): string;
  bindInitiateOfferCallback(callback: (offerId: string) => void): void;
  bindOnIncomingDataCallback(callback: (data: SignalingDataInterface) => void): void;
  send(to: string, data: SignalingDataInterface): void;
  prepare(): Promise<void>;
  onWebRtcConnectionError(id: string): void;
}
