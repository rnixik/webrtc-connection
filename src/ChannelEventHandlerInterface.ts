export interface ChannelEventHandlerInterface {
  onOpen(): void;
  onMessage(message: string): void;
  onClose(): void;
}
