export {};

declare global {
  interface Window {
    cafeDesktop?: {
      onCloseRequested(callback: () => void): () => void;
      requestClose(): void;
      completeClose(): void;
    };
  }
}
