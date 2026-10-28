import { app, BrowserWindow } from "electron";

const url = process.env.PANE_DESKTOP_URL;
if (!url) throw new Error("The desktop host URL is missing.");
const host = new URL(url);
if (host.hostname !== "127.0.0.1" || host.protocol !== "http:")
  throw new Error("The desktop host URL is invalid.");

app.setName("Pane System");
app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 600,
    minHeight: 400,
    title: "Pane System",
    backgroundColor: "#121314",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  window.webContents.session.setPermissionRequestHandler(
    (contents, permission, respond) =>
      respond(
        contents === window.webContents &&
          new URL(contents.getURL()).origin === host.origin &&
          (permission === "clipboard-read" ||
            permission === "clipboard-sanitized-write"),
      ),
  );
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, destination) => {
    if (new URL(destination).origin !== host.origin) event.preventDefault();
  });
  await window.loadURL(url);
});
app.on("window-all-closed", () => app.quit());
