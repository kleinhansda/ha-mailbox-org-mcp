# mailbox.org MCP

## Voraussetzungen

- **Passwörter** bei mailbox.org anlegen (Einstellungen → Sicherheit), niemals
  das Hauptpasswort verwenden. Pro Anwendungstyp ein eigenes: ein
  **E-Mail-App-Passwort** für Mail (`app_password`) und ein
  **Anwendungspasswort „Kalender- und Adressbuch-Client (CalDAV/CardDAV)“** für
  Kalender und Adressbuch (`dav_password`).
- Eine **öffentliche HTTPS-Adresse** mit Reverse-Proxy (z. B. Nginx Proxy
  Manager oder Cloudflare Tunnel) auf Port `8099` des Add-ons. Ohne TLS
  funktioniert der OAuth-Login nicht. Läuft der Proxy/Tunnel selbst als App in
  Home Assistant, zeigt er auf den internen Hostnamen, z. B.
  `http://<repo-hash>-mailbox-org-mcp:8099`. Ein Host-Port ist dann nicht nötig
  (Standard seit 0.2.0: nicht veröffentlicht).

## Optionen

| Option                     | Bedeutung                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `email`                    | Deine mailbox.org-Adresse                                                                  |
| `app_password`             | E-Mail-App-Passwort (IMAP, SMTP). Für Kalender/Adressbuch nur als Fallback, wenn `dav_password` leer ist |
| `dav_password`             | Anwendungspasswort vom Typ „Kalender- und Adressbuch-Client (CalDAV/CardDAV)“. mailbox.org vergibt Passwörter je Anwendungstyp, ein E-Mail-App-Passwort gilt nicht für Kalender/Adressbuch (HTTP 401). Leer = `app_password` |
| `hub_password`             | Passwort für den Login, den Claude beim Verbinden anzeigt                                  |
| `external_url`             | Öffentliche Basis-URL ohne Pfad, z. B. `https://mcp.example.net`                           |
| `timezone`                 | IANA-Zeitzone für Kalendertermine                                                          |
| `essential_tools`          | Nur die kuratierte Werkzeugauswahl je Dienst laden (empfohlen)                             |
| `mail_enabled`             | Mail lesen (IMAP)                                                                           |
| `mail_write`               | Verschieben, Flags, Entwürfe, Löschen erlauben (Löschen/Verschieben fragen trotzdem nach) |
| `smtp_enabled`             | SMTP-Server laden (ohne `smtp_allow_send` nur Vorschau)                                     |
| `smtp_allow_send`          | Senden erlauben – **erst nach Test aktivieren**                                            |
| `smtp_allowed_recipients`  | Pflicht bei Senden: `a@x.de,@firma.de`; `*` = alle                                         |
| `smtp_from_name`           | Anzeigename des Absenders                                                                  |
| `calendar_enabled` / `calendar_write` | Kalender lesen / schreiben                                                      |
| `contacts_enabled` / `contacts_write` | Adressbuch lesen / schreiben                                                    |
| `imap_trusted_authserv_id` | authserv-id aus dem `Authentication-Results`-Header von mailbox.org; macht SPF/DKIM-Urteile vertrauenswürdig |
| `trusted_proxies`          | IP/CIDR deines Reverse-Proxys, damit das Login-Rate-Limit pro Client greift (z. B. `172.30.32.0/23` für einen Tunnel als HA-App) |
| `passkey_enabled`          | Passkey-Gate vor den Hub schalten (siehe unten)                                            |
| `oidc_issuer`              | Basis-URL des OIDC-Anbieters, z. B. `https://id.example.net`                              |
| `oidc_client_id` / `oidc_client_secret` | OIDC-Client, den du beim Anbieter für dieses Add-on anlegst                  |
| `passkey_allowed_users`    | Wer freigeben darf: E-Mail-Adressen, Benutzernamen oder `sub`, kommagetrennt               |

Standard ist überall **nur lesen**. Schreib- und Sendewerkzeuge werden nicht
abgelehnt, sondern gar nicht erst registriert.

## Passkey-Login (optional)

`mcp-hub` kennt als Login nur das `hub_password`. Mit `passkey_enabled` lauscht
auf Port 8099 ein Gate, der Hub läuft intern auf 8100:

- Login- und Freigabeseiten (`/interaction/…`) verlangen zuerst eine Anmeldung
  beim OIDC-Anbieter (z. B. Pocket ID → Passkey).
- Danach zeigt das Gate die Freigabeseite des Hubs mit Client-Name und
  Rückleitungsziel, aber ohne Passwortfeld. Ein Klick auf **Freigeben** schickt
  das Formular ab, das Gate setzt das `hub_password` serverseitig ein.
- Ein Login-Versuch ohne Passkey-Sitzung wird abgewiesen – das Hub-Passwort ist
  von außen nicht mehr verwendbar. `hub_password` bleibt trotzdem Pflicht;
  nimm einen langen Zufallswert, du tippst ihn nie ein.
- Alles andere (`/hub`, `/<name>/mcp`, `/token`, `/register`, `/.well-known/…`)
  reicht das Gate unverändert durch. Das sind Aufrufe der MCP-Clients von ihrem
  Server aus, geschützt durch die Tokens des Hubs.

Einrichtung bei **Pocket ID**:

1. Administration → OIDC-Clients → Hinzufügen.
2. Name z. B. `mailbox.org MCP`, Callback-URL:
   `https://<external_url>/passkey/callback` (exakt so, ohne Platzhalter).
3. Kein öffentlicher Client, PKCE darf an sein. Client-ID und Client-Secret
   kopieren.
4. Optional: Zugriff auf eine Benutzergruppe beschränken.
5. Im Add-on setzen: `passkey_enabled: true`, `oidc_issuer` (z. B.
   `https://id.example.net`), `oidc_client_id`, `oidc_client_secret`,
   `passkey_allowed_users` (deine E-Mail-Adresse bei Pocket ID). App neu
   starten.

Im Log erscheint dann `[passkey-gate] lauscht auf :8099 …`. Jede Anmeldung und
jede abgewiesene Anfrage wird dort protokolliert.

Die Passkey-Sitzung gilt 10 Minuten und nur für den Freigabe-Moment. Danach
verbinden sich bereits freigegebene Clients über ihre Tokens, ohne Login.

## Verbinden

- **Claude (Web/Desktop/Mobile):** Einstellungen → Connectors → Custom
  Connector → `https://<external_url>/hub` → mit `hub_password` anmelden
  (bzw. mit Passkey, wenn `passkey_enabled` an ist).
- **Einzelner Dienst:** `https://<external_url>/mail/mcp`,
  `/smtp/mcp`, `/calendar/mcp`, `/contacts/mcp`.

## Verwaltung

Verbundene Clients anzeigen oder sperren (Terminal-Add-on, Container-Name
ggf. mit `docker ps` prüfen):

```sh
docker exec addon_<repo-hash>_mailbox_org_mcp \
  setpriv --reuid=1000 --regid=1000 --init-groups \
  env DATA_PATH=/data/hub node /app/dist/admin.js clients list
```

## Hinweise

- `/data/hub` enthält OAuth-Schlüssel und Freigaben. Wird es gelöscht, müssen
  sich alle Clients neu verbinden.
- Prüfe gelegentlich unter mailbox.org → Einstellungen → E-Mail → Filter, ob
  unbekannte Weiterleitungen aktiv sind. Dieses Add-on legt keine an, ein
  kompromittiertes App-Passwort könnte es aber.
