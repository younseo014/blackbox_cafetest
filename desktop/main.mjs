import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ORIGIN = "memoryguardcafe://app";
let quitApproved = false;
let mainWindow = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "memoryguardcafe",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function rendererPathFromUrl(requestUrl) {
  const rendererRoot = path.resolve(__dirname, "dist-desktop");
  const url = new URL(requestUrl);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const candidate = path.resolve(rendererRoot, `.${pathname}`);

  if (candidate !== rendererRoot && !candidate.startsWith(`${rendererRoot}${path.sep}`)) {
    return null;
  }

  return candidate;
}

async function registerDesktopProtocol() {
  await protocol.handle("memoryguardcafe", (request) => {
    const filePath = rendererPathFromUrl(request.url);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function configurePermissions() {
  const isTrustedOrigin = (requestingUrl) =>
    requestingUrl === APP_ORIGIN || requestingUrl.startsWith(`${APP_ORIGIN}/`);
  const isCameraPermission = (permission) => permission === "media";

  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return isCameraPermission(permission) && isTrustedOrigin(requestingOrigin);
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(isCameraPermission(permission) && isTrustedOrigin(webContents.getURL()));
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: "#f6f8fa",
    title: "메모리 가드",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;

  window.on("close", (event) => {
    if (quitApproved) return;
    event.preventDefault();
    window.show();
    window.focus();
    window.webContents.send("closing-checkin:requested");
  });
  window.on("closed", () => { if (mainWindow === window) mainWindow = null; });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  void window.loadURL(`${APP_ORIGIN}/index.html`);
}

app.whenReady().then(async () => {
  await registerDesktopProtocol();
  configurePermissions();
  ipcMain.on("closing-checkin:complete", (event) => {
    if (event.sender !== mainWindow?.webContents || !event.sender.getURL().startsWith(`${APP_ORIGIN}/`)) return;
    quitApproved = true;
    app.quit();
  });
  ipcMain.on("closing-checkin:request", (event) => {
    if (event.sender !== mainWindow?.webContents || !event.sender.getURL().startsWith(`${APP_ORIGIN}/`)) return;
    mainWindow.close();
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", (event) => {
  if (quitApproved || !mainWindow) return;
  event.preventDefault();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("closing-checkin:requested");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
