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
| Gateway     | [mcp-hub](https://github.com/ni-c/mcp-hub) 0.11.7         | HTTP + OAuth 2.1  | –                  |
| Login       | Passkey-Gate (eigener Code, `gate.mjs`)                   | OIDC (z. B. Pocket ID) | **aus**       |
| Mail lesen  | [imap-mcp](https://github.com/ni-c/imap-mcp) 0.5.3        | IMAP              | nur lesen          |
| Mail senden | [smtp-mcp](https://github.com/ni-c/smtp-mcp) 0.2.0        | SMTP              | **aus**            |
| Kalender    | [caldav-mcp](https://github.com/ni-c/caldav-mcp) 0.1.5    | CalDAV            | nur lesen          |
| Adressbuch  | [carddav-mcp](https://github.com/ni-c/carddav-mcp) 0.1.3  | CardDAV           | nur lesen          |

Lesen und Senden sind bewusst getrennte Prozesse: `imap-mcp` kann nicht
senden, `smtp-mcp` sendet nur an eine Empfänger-Allowlist und nur nach
menschlicher Bestätigung. Damit kann eine präparierte E-Mail (Prompt
Injection) keine Daten nach außen schicken, solange Senden aus ist.

**Passkey-Login (optional):** `mcp-hub` kennt als Login nur ein Passwort.
Mit `passkey_enabled` steht ein kleines Gate davor, das für die Freigabeseiten
eine Anmeldung bei einem OIDC-Anbieter (z. B. Pocket ID mit Passkey) verlangt
und das Hub-Passwort erst danach serverseitig einsetzt. Das Passwort wird nie
eingetippt und ist von außen nicht mehr nutzbar. MCP-Aufrufe, Token- und
Registrierungs-Endpunkte reicht das Gate unverändert durch.

**Nicht enthalten:** mailbox.org Drive (WebDAV) und Sieve-Filter. Für beide
gibt es noch keinen Server mit vergleichbarem Sicherheitsmodell; Sieve ist
zudem gefährlich, weil ein `redirect`-Filter dauerhaft serverseitig weiterleitet.

## Installation

1. Home Assistant → Einstellungen → Apps → App-Store → ⋮ → Repositories
2. `https://github.com/kleinhansda/ha-mailbox-org-mcp` hinzufügen
3. „mailbox.org MCP“ installieren, Optionen setzen (siehe [DOCS.md](mailbox_org_mcp/DOCS.md)), starten

## Tests

`bash tests/gate/run.sh [RS256|ES256|EdDSA]` prüft das Passkey-Gate gegen
einen Mock-IdP und eine Hub-Attrappe (Node 22+, keine Abhängigkeiten).

## Status

Frühe Version. Mail, Kalender und Adressbuch verbinden sich mit einem echten
mailbox.org-Konto. Das Passkey-Gate ist gegen mcp-hub 0.11.7 mit einem
Test-OIDC-Anbieter durchgetestet, aber noch nicht gegen Pocket ID selbst.
Issues willkommen.

## Lizenz

MIT. Die gebündelten Server stehen unter ihrer eigenen MIT-Lizenz
(© Willi Thiel).
