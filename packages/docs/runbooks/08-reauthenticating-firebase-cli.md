# Runbook: Re‑authenticating the Firebase CLI (and fixes for timeouts)

This runbook covers reliable ways to re‑authenticate the Firebase CLI and work around timeouts and network restrictions.

## Option A — Reauth with device flow (works behind firewalls)

1. Run the device login flow:
   ```bash
   firebase login --reauth --no-localhost --debug
   ```
2. Copy the URL shown, open it on any device/network, complete Google login, then paste the code back into the terminal when prompted.
3. Verify auth works:
   ```bash
   firebase projects:list
   ```

## Option B — Use a CI token (bypass local login entirely)

1. On a machine/network that can reach Google, generate a token:
   ```bash
   npm i -g firebase-tools@latest
   firebase login:ci
   ```
2. Copy the printed token and set it on the blocked machine:
   ```bash
   export FIREBASE_TOKEN="<PASTE_TOKEN_HERE>"
   ```
3. Deploy non‑interactively:
   ```bash
   firebase deploy --non-interactive --project day-planner-london-mvp
   ```

## Option C — Clear local Firebase CLI state and retry

Sometimes corrupted cache/config causes timeouts. Clear and retry:

```bash
firebase logout --all || true
rm -rf ~/.cache/firebase ~/.config/configstore/firebase-tools.json 2>/dev/null || true
firebase login --no-localhost --reauth --debug
```

## Option D — Use a proxy or alternate network

- If on a restricted network, set a proxy before logging in:
  ```bash
  export HTTPS_PROXY=http://<proxy-host>:<proxy-port>
  export NO_PROXY=localhost,127.0.0.1
  firebase login --no-localhost --reauth --debug
  ```
- Alternatively, use a mobile hotspot or VPN to complete Option A once, then proceed normally.

## Notes

- The Firebase CLI does not use `GOOGLE_APPLICATION_CREDENTIALS` for auth. Prefer `firebase login` or `FIREBASE_TOKEN`.
- If you see `command requires scopes` and repeated timeouts, prefer Option B (token) or Option A (device flow) from a different network.
