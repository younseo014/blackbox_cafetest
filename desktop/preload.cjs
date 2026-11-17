// Electron sandboxed preload exposes a limited CommonJS require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cafeDesktop", {
  onCloseRequested(callback) {
    const listener = () => callback();
    ipcRenderer.on("closing-checkin:requested", listener);
    return () => ipcRenderer.removeListener("closing-checkin:requested", listener);
  },
  requestClose() { ipcRenderer.send("closing-checkin:request"); },
  completeClose() { ipcRenderer.send("closing-checkin:complete"); },
});
