// Entrypoint: reads Home Assistant add-on options, writes mcp-hub's mcp.json,
// drops root and starts mcp-hub. Secrets are passed via the hub's environment
// and expanded by mcp-hub (${VAR}); they are never written into mcp.json.
import { chownSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const OPTIONS = process.env.OPTIONS_PATH || "/data/options.json";
const HUB_DATA = "/data/hub";
const CONFIG_DIR = "/data/hub-config";
const CONFIG = `${CONFIG_DIR}/mcp.json`;
const NODE_UID = 1000;
const NODE_GID = 1000;
const DRY_RUN = process.argv.includes("--dry-run");

const log = (m) => console.error(`[mailbox-org-mcp] ${m}`);
const fail = (m) => {
  log(`FEHLER: ${m}`);
  process.exit(1);
};

const o = JSON.parse(readFileSync(OPTIONS, "utf8"));
const str = (v) => (typeof v === "string" ? v.trim() : "");

const email = str(o.email);
const appPassword = str(o.app_password);
const hubPassword = str(o.hub_password);
const externalUrl = str(o.external_url).replace(/\/+$/, "");

if (!email || !appPassword) fail("'email' und 'app_password' sind Pflicht.");
if (!hubPassword) fail("'hub_password' (Login für den Hub) ist Pflicht.");
if (!/^https:\/\/[^/]+$/.test(externalUrl))
  fail("'external_url' muss eine https-URL ohne Pfad sein, z. B. https://mcp.example.net");

const essential = o.essential_tools !== false;
const servers = {};

// --- Mail lesen (IMAP) ---------------------------------------------------
if (o.mail_enabled) {
  const env = {
    IMAP_HOST: "imap.mailbox.org",
    IMAP_PORT: "993",
    IMAP_TLS: "implicit",
    IMAP_USER: "${MBX_EMAIL}",
    IMAP_PASSWORD: "${MBX_PASSWORD}",
    // imap-mcp: nur das Literal "false" schaltet Schreib-Tools frei
    IMAP_READ_ONLY: o.mail_write ? "false" : "true",
  };
  if (essential) env.IMAP_ALLOW_TOOLS = "essential";
  if (str(o.imap_trusted_authserv_id)) env.IMAP_TRUSTED_AUTHSERV_ID = str(o.imap_trusted_authserv_id);
  servers.mail = { command: "imap-mcp", args: [], env };
}

// --- Mail senden (SMTP) --------------------------------------------------
if (o.smtp_enabled) {
  const name = str(o.smtp_from_name);
  const env = {
    SMTP_HOST: "smtp.mailbox.org",
    SMTP_PORT: "587",
    SMTP_TLS: "starttls",
    SMTP_USER: "${MBX_EMAIL}",
    SMTP_PASSWORD: "${MBX_PASSWORD}",
    SMTP_FROM: name ? `${name} <${email}>` : email,
    SMTP_ALLOW_SEND: o.smtp_allow_send ? "true" : "false",
  };
  if (o.smtp_allow_send) {
    const rcpt = str(o.smtp_allowed_recipients);
    if (!rcpt) fail("'smtp_allow_send' braucht 'smtp_allowed_recipients' (Adressen/@domains, '*' = alle).");
    env.SMTP_ALLOWED_RECIPIENTS = rcpt;
  }
  if (essential) env.SMTP_ALLOW_TOOLS = "essential";
  servers.smtp = { command: "smtp-mcp", args: [], env };
}

// --- Kalender (CalDAV) ---------------------------------------------------
if (o.calendar_enabled) {
  const env = {
    CALDAV_URL: "https://dav.mailbox.org/",
    CALDAV_USERNAME: "${MBX_EMAIL}",
    CALDAV_PASSWORD: "${MBX_PASSWORD}",
    CALDAV_TIMEZONE: str(o.timezone) || "Europe/Berlin",
    CALDAV_USER_EMAIL: email,
    CALDAV_READ_ONLY: o.calendar_write ? "false" : "true",
  };
  if (essential) env.CALDAV_ALLOW_TOOLS = "essential";
  servers.calendar = { command: "caldav-mcp", args: [], env };
}

// --- Adressbuch (CardDAV) ------------------------------------------------
if (o.contacts_enabled) {
  const env = {
    CARDDAV_URL: "https://dav.mailbox.org/",
    CARDDAV_USERNAME: "${MBX_EMAIL}",
    CARDDAV_PASSWORD: "${MBX_PASSWORD}",
    CARDDAV_READ_ONLY: o.contacts_write ? "false" : "true",
  };
  if (essential) env.CARDDAV_ALLOW_TOOLS = "essential";
  servers.contacts = { command: "carddav-mcp", args: [], env };
}

if (Object.keys(servers).length === 0) fail("Kein Dienst aktiviert.");

const config = JSON.stringify({ mcpServers: servers }, null, 2) + "\n";

if (DRY_RUN) {
  process.stdout.write(config);
  process.exit(0);
}

for (const dir of [HUB_DATA, CONFIG_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  chownSync(dir, NODE_UID, NODE_GID);
}
writeFileSync(CONFIG, config, { mode: 0o644 });
log(`Dienste: ${Object.keys(servers).join(", ")} | Werkzeugauswahl: ${essential ? "essential" : "alle"}`);

const env = {
  PATH: process.env.PATH,
  HOME: "/home/node",
  NODE_ENV: "production",
  PORT: "8099",
  CONFIG_PATH: CONFIG,
  DATA_PATH: HUB_DATA,
  EXTERNAL_URL: externalUrl,
  PASSWORD: hubPassword,
  MBX_EMAIL: email,
  MBX_PASSWORD: appPassword,
};
if (str(o.trusted_proxies)) env.TRUSTED_PROXIES = str(o.trusted_proxies);

// Root ablegen: Hub und alle Kindprozesse laufen als node (uid 1000)
const child = spawn(
  "setpriv",
  [`--reuid=${NODE_UID}`, `--regid=${NODE_GID}`, "--init-groups", "--", "node", "/app/dist/index.js"],
  { env, stdio: "inherit", cwd: "/app" },
);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
