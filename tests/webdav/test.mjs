// Test für webdav-mcp.mjs gegen einen lokalen WebDAV-Server (webdav-server).
// Aufruf: bash tests/webdav/run.sh
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import wds from "webdav-server";
const here = dirname(fileURLToPath(import.meta.url));
const SERVER = join(here, "../../mailbox_org_mcp/webdav/webdav-mcp.mjs");
const { Client } = await import(join(here, "../../mailbox_org_mcp/webdav/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js"));
const { StdioClientTransport } = await import(join(here, "../../mailbox_org_mcp/webdav/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js"));
const webdav = wds.v2;

// --- Testdaten -------------------------------------------------------------
const dir = mkdtempSync(join(tmpdir(), "wd-"));
mkdirSync(join(dir, "Userstore/David/Dokumente/Steuer"), { recursive: true });
mkdirSync(join(dir, "Geheim"), { recursive: true });
writeFileSync(join(dir, "Userstore/David/Dokumente/notiz.md"), "# Hallo\nÄpfel & Birnen\n");
writeFileSync(join(dir, "Userstore/David/Dokumente/Steuer/steuer-2025.txt"), "Belege");
writeFileSync(join(dir, "Userstore/David/bild.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0xff, 0xfe]));
writeFileSync(join(dir, "Userstore/David/kaputt.txt"), Buffer.from([0xff, 0xfe, 0x00, 0xc3]));
writeFileSync(join(dir, "Userstore/David/gross.txt"), "x".repeat(5000));
writeFileSync(join(dir, "Geheim/passwort.txt"), "streng geheim");

const um = new webdav.SimpleUserManager();
const user = um.addUser("david@example.org", "pw", false);
const pm = new webdav.SimplePathPrivilegeManager();
pm.setRights(user, "/", ["all"]);
const srv = new webdav.WebDAVServer({ port: 19480, hostname: "127.0.0.1", httpAuthentication: new webdav.HTTPBasicAuthentication(um, "t"), privilegeManager: pm });
await new Promise((r, j) => srv.setFileSystem("/servlet/webdav.infostore", new webdav.PhysicalFileSystem(dir), (ok) => (ok ? r() : j(new Error("mount")))));
await new Promise((r) => srv.start(r));

let failures = 0;
const check = (name, cond, info = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : "  -> " + info}`); if (!cond) failures++; };

async function connect(extra = {}) {
  const t = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: { PATH: process.env.PATH, WEBDAV_URL: "http://127.0.0.1:19480/servlet/webdav.infostore", WEBDAV_USERNAME: "david@example.org", WEBDAV_PASSWORD: "pw", WEBDAV_MAX_READ_BYTES: "4096", ...extra },
    stderr: "pipe",
  });
  const c = new Client({ name: "test", version: "0" });
  await c.connect(t);
  return c;
}
const call = async (c, name, args) => {
  const r = await c.callTool({ name, arguments: args });
  return { err: !!r.isError, text: r.content?.[0]?.text ?? "" };
};
const json = (r) => { try { return JSON.parse(r.text); } catch { return null; } };

// --- 1. Nur lesen, Basis /Userstore/David -----------------------------------
let c = await connect({ WEBDAV_ROOT: "/Userstore/David" });
let tools = (await c.listTools()).tools.map((t) => t.name).sort();
check("nur Lese-Werkzeuge", JSON.stringify(tools) === JSON.stringify(["drive_info", "drive_list", "drive_read", "drive_search"]), tools.join(","));

let r = await call(c, "drive_list", { path: "/" });
let j = json(r);
check("list /", !r.err && j?.items?.map((i) => i.name).join(",") === "Dokumente,bild.png,gross.txt,kaputt.txt", r.text);
check("list Pfade relativ zur Basis", j?.items?.[0]?.path === "/Dokumente", j?.items?.[0]?.path);

r = await call(c, "drive_list", { path: "/Dokumente" });
check("list Unterordner", json(r)?.items?.map((i) => i.name).join(",") === "Steuer,notiz.md", r.text);

r = await call(c, "drive_read", { path: "/Dokumente/notiz.md" });
check("read Text inkl. Umlaute", !r.err && r.text.includes("Äpfel & Birnen") && r.text.includes("nicht vertrauenswürdig"), r.text);

r = await call(c, "drive_read", { path: "/bild.png" });
check("read Binärdatei abgelehnt", r.err && /Keine Textdatei/.test(r.text), r.text);
r = await call(c, "drive_read", { path: "/kaputt.txt" });
check("read ungültiges UTF-8 abgelehnt", r.err && /UTF-8/.test(r.text), r.text);
r = await call(c, "drive_read", { path: "/gross.txt" });
check("read Größenlimit", r.err && /zu groß/.test(r.text), r.text);
r = await call(c, "drive_read", { path: "/Dokumente" });
check("read Ordner abgelehnt", r.err && /Ordner/.test(r.text), r.text);

for (const p of ["../../Geheim/passwort.txt", "/../../Geheim/passwort.txt", "%2e%2e/%2e%2e/Geheim/passwort.txt", "%252e%252e/%252e%252e/Geheim/passwort.txt", "Dokumente/../../../Geheim/passwort.txt", "..\\..\\Geheim\\passwort.txt"]) {
  r = await call(c, "drive_read", { path: p });
  check(`Ausbruch blockiert: ${p}`, r.err && !r.text.includes("streng geheim"), r.text);
}
r = await call(c, "drive_read", { path: "/Geheim/passwort.txt" });
check("absoluter Pfad bleibt in Basis", r.err && !r.text.includes("streng geheim"), r.text);

r = await call(c, "drive_search", { query: "STEUER" });
j = json(r);
check("search rekursiv, ohne Groß/Klein", j?.items?.map((i) => i.path).join(",") === "/Dokumente/Steuer,/Dokumente/Steuer/steuer-2025.txt", r.text);
r = await call(c, "drive_search", { query: "steuer", max_depth: 1 });
check("search max_depth", json(r)?.count === 0, r.text);
r = await call(c, "drive_search", { query: "passwort" });
check("search bleibt in Basis", json(r)?.count === 0, r.text);

r = await call(c, "drive_info", { path: "/Dokumente/notiz.md" });
check("info", json(r)?.type === "file" && json(r)?.size > 0, r.text);
r = await call(c, "drive_info", { path: "/gibtsnicht" });
check("info 404", r.err && /404/.test(r.text), r.text);
await c.close();

// --- 2. Schreiben ----------------------------------------------------------
c = await connect({ WEBDAV_ROOT: "/Userstore/David", WEBDAV_READ_ONLY: "false" });
tools = (await c.listTools()).tools.map((t) => t.name).sort();
check("Schreibwerkzeuge da, kein Löschen", tools.includes("drive_write_file") && tools.includes("drive_create_folder") && !tools.some((t) => /delete|move|copy|share/.test(t)), tools.join(","));
r = await call(c, "drive_create_folder", { path: "/Neu/Unter" });
check("create_folder rekursiv", !r.err && existsSync(join(dir, "Userstore/David/Neu/Unter")), r.text);
r = await call(c, "drive_write_file", { path: "/Neu/a.md", content: "eins" });
check("write neu", !r.err && readFileSync(join(dir, "Userstore/David/Neu/a.md"), "utf8") === "eins", r.text);
r = await call(c, "drive_write_file", { path: "/Neu/a.md", content: "zwei" });
check("write ohne overwrite abgelehnt", r.err && readFileSync(join(dir, "Userstore/David/Neu/a.md"), "utf8") === "eins", r.text);
r = await call(c, "drive_write_file", { path: "/Neu/a.md", content: "zwei", overwrite: true });
check("write mit overwrite", !r.err && readFileSync(join(dir, "Userstore/David/Neu/a.md"), "utf8") === "zwei", r.text);
r = await call(c, "drive_write_file", { path: "../../Geheim/x.txt", content: "böse" });
check("write Ausbruch blockiert", r.err && !existsSync(join(dir, "Geheim/x.txt")), r.text);
await c.close();

// --- 3. Falsches Passwort, Wurzel / -----------------------------------------
c = await connect({ WEBDAV_PASSWORD: "falsch" });
r = await call(c, "drive_list", { path: "/" });
check("401 mit Hinweis", r.err && /401/.test(r.text) && /WebDAV-Client/.test(r.text), r.text);
await c.close();
c = await connect({});
r = await call(c, "drive_list", { path: "/" });
check("Basis / listet Wurzel", json(r)?.items?.map((i) => i.name).join(",") === "Geheim,Userstore", r.text);
await c.close();

srv.stop(() => {});
console.log(failures ? `\n${failures} FEHLER` : "\nalle Tests ok");
process.exit(failures ? 1 : 0);
