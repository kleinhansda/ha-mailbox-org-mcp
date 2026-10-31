# Changelog

## 0.2.0

- Neu: optionales **Passkey-Gate** (`passkey_enabled`). Freigaben laufen über
  einen OIDC-Anbieter wie Pocket ID; das Hub-Passwort wird serverseitig
  eingesetzt und ist von außen nicht mehr verwendbar.
- mcp-hub 0.11.7 (behebt einen Absturz durch präparierte komprimierte
  Request-Bodies, CVE-2026-111181).
- Port 8099 wird standardmäßig nicht mehr auf dem Host veröffentlicht; ein
  Tunnel/Proxy als HA-App nutzt den internen Hostnamen. Bestehende
  Installationen behalten ihre Einstellung.

## 0.1.0

- Erste Version: mcp-hub 0.11.6 mit imap-mcp 0.5.3, smtp-mcp 0.2.0,
  caldav-mcp 0.1.5, carddav-mcp 0.1.3.
- Standard: nur lesen, Senden aus, kuratierte Werkzeugauswahl.
