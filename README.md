# mailbox.org MCP – Home-Assistant-Add-on

Bündelt die mailbox.org-Dienste **Mail, Kalender und Adressbuch** als
[MCP](https://modelcontextprotocol.io)-Server in einem Home-Assistant-Add-on –
erreichbar für Claude (Web, Desktop, Mobile), ChatGPT und andere MCP-Clients
über **einen** Connector.

> Inoffiziell. Kein Produkt von mailbox.org (Heinlein Hosting GmbH).

## Aufbau

Das Add-on erfindet nichts neu, sondern kombiniert gepflegte Einzelserver
hinter einem Gateway:

| Dienst      | Server                                                    | Protokoll         | Standard           |
| ----------- | --------------------------------------------------------- | ----------------- | ------------------ |
| Gateway     | [mcp-hub](https://github.com/ni-c/mcp-hub) 0.11.6         | HTTP + OAuth 2.1  | –                  |
| Mail lesen  | [imap-mcp](https://github.com/ni-c/imap-mcp) 0.5.3        | IMAP              | nur lesen          |
| Mail senden | [smtp-mcp](https://github.com/ni-c/smtp-mcp) 0.2.0        | SMTP              | **aus**            |
| Kalender    | [caldav-mcp](https://github.com/ni-c/caldav-mcp) 0.1.5    | CalDAV            | nur lesen          |
| Adressbuch  | [carddav-mcp](https://github.com/ni-c/carddav-mcp) 0.1.3  | CardDAV           | nur lesen          |

Lesen und Senden sind bewusst getrennte Prozesse: `imap-mcp` kann nicht
senden, `smtp-mcp` sendet nur an eine Empfänger-Allowlist und nur nach
menschlicher Bestätigung. Damit kann eine präparierte E-Mail (Prompt
Injection) keine Daten nach außen schicken, solange Senden aus ist.

**Nicht enthalten:** mailbox.org Drive (WebDAV) und Sieve-Filter. Für beide
gibt es noch keinen Server mit vergleichbarem Sicherheitsmodell; Sieve ist
zudem gefährlich, weil ein `redirect`-Filter dauerhaft serverseitig weiterleitet.

## Installation

1. Home Assistant → Einstellungen → Add-ons → Add-on-Store → ⋮ → Repositories
2. `https://github.com/kleinhansda/ha-mailbox-org-mcp` hinzufügen
3. „mailbox.org MCP“ installieren, Optionen setzen (siehe [DOCS.md](mailbox_org_mcp/DOCS.md)), starten

## Status

Frühe Version, noch nicht gegen ein echtes mailbox.org-Konto getestet.
Issues willkommen.

## Lizenz

MIT. Die gebündelten Server stehen unter ihrer eigenen MIT-Lizenz
(© Willi Thiel).
