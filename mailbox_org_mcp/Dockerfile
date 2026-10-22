# Basis: mcp-hub (Node 24, tini, uid 1000 "node"). Multi-arch amd64/arm64.
# Für reproduzierbare Builds zusätzlich auf @sha256:<digest> pinnen.
FROM ghcr.io/ni-c/mcp-hub:0.11.6

USER root

# Einzelserver exakt gepinnt, ohne Install-Skripte
RUN npm install -g --ignore-scripts \
      @ni-c/imap-mcp@0.5.3 \
      @ni-c/smtp-mcp@0.2.0 \
      @ni-c/caldav-mcp@0.1.5 \
      @ni-c/carddav-mcp@0.1.3 \
    && npm cache clean --force

COPY run.mjs /app/run.mjs

# Entrypoint läuft als root (liest /data/options.json, setzt Rechte),
# startet den Hub danach per setpriv als uid 1000.
ENTRYPOINT ["tini", "--"]
CMD ["node", "/app/run.mjs"]
