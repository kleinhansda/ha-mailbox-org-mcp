# mailbox.org MCP

## Voraussetzungen

- **App-Passwort** bei mailbox.org anlegen (Einstellungen → Sicherheit →
  App-Passwörter). Niemals das Hauptpasswort verwenden.
- Eine **öffentliche HTTPS-Adresse** mit Reverse-Proxy (z. B. Nginx Proxy
  Manager oder Cloudflare Tunnel) auf Port `8099` des Add-ons. Ohne TLS
  funktioniert der OAuth-Login nicht.

## Optionen

| Option                     | Bedeutung                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `email`                    | Deine mailbox.org-Adresse                                                                  |
| `app_password`             | App-Passwort (gilt für IMAP, SMTP, CalDAV, CardDAV)                                         |
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
| `trusted_proxies`          | IP/CIDR deines Reverse-Proxys, damit das Login-Rate-Limit pro Client greift               |

Standard ist überall **nur lesen**. Schreib- und Sendewerkzeuge werden nicht
abgelehnt, sondern gar nicht erst registriert.

## Verbinden

- **Claude (Web/Desktop/Mobile):** Einstellungen → Connectors → Custom
  Connector → `https://<external_url>/hub` → mit `hub_password` anmelden.
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
