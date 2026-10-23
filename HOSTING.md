# Run Fermi documentation on a GCP VM

The existing root Markdown files remain the source of truth. The build generates
Starlight pages, navigation, search, and a Decap Markdown editor without rewriting
those source documents. Do not edit generated `src/content/docs/` files.

## One-time VM setup

Use a dedicated Ubuntu 24.04 or Debian 12 VM with at least 2 GB RAM and 15 GB disk;
2 vCPUs and 4 GB RAM are a comfortable starting point for builds on the VM.
Reserve a static external IP. In GCP, allow inbound TCP ports 80 and 443 to this VM
with a firewall rule or its HTTP/HTTPS network tags. Leave SSH limited to your
normal administration route. Do not open the OAuth container's port 3000.

The script cannot change GCP firewall rules or reserve an IP without GCP access.
It uses ports 80 and 443, so use a VM where another web server does not own them.

Create a GitHub OAuth App at <https://github.com/settings/applications/new>:

- Application name: `Fermi Documentation`
- Homepage URL: `https://docs.fermi.trade`
- Authorization callback URL: `https://docs.fermi.trade/oauth/callback`

Keep its client secret on the VM. Do not put it in Git or chat. Organization OAuth
app restrictions may require approval from a Fermi-DEX administrator. The default
`repo` scope supports private repositories; set `OAUTH_SCOPE=public_repo` during
initial setup if this documentation repository is public and you want that scope.
Editors must have write access to this repository. The broker checks that access
before returning the token to Decap. Decap keeps the user token in browser storage;
log out on shared computers. This deployment supports GitHub, not GitHub Enterprise.

On the VM:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/Fermi-DEX/fermi-trade-documentation.git
cd fermi-trade-documentation
sudo ./setup.sh
```

Enter the OAuth app's client ID and secret when prompted. The secret input is
hidden. Setup installs Docker from its signed official apt repository if needed,
builds the site, starts Caddy and OAuth containers, and enables automatic updates.
It stores configuration in `/etc/fermi-docs/config.env`, readable only by root.
Docker administrators also have access to container environment configuration.

For a private repository, clone with an existing read-only GitHub deploy key over
SSH instead. Automatic updates run Git as the checkout owner and reuse that
owner's Git authentication. No GitHub Actions SSH secret or inbound webhook is
needed. Read-only Git access is enough on the VM; Decap writes as the signed-in
editor through the GitHub API.

For public documentation without the browser editor, use:

```bash
sudo ./setup.sh --no-editor
```

This explicitly disables editor login, while `/admin/` explains how to enable it.
Enable or rotate editor credentials with `sudo ./setup.sh --configure`.
Do not delete the Caddy data volume; it retains HTTPS certificates across restarts.

## DNS handoff

Create this DNS record in the `fermi.trade` zone:

| Type | Name | Value |
| --- | --- | --- |
| A | `docs` | Your VM's static external IPv4 address |

Remove any stale `AAAA` record unless this VM also has working public IPv6.
Caddy obtains and renews the HTTPS certificate after DNS resolves and ports
80/443 are reachable. For a DNS provider with proxying, start in DNS-only mode
until direct HTTPS is verified. Before DNS, visit `http://VM_EXTERNAL_IP/` to check
the public docs; GitHub editor login intentionally uses the final HTTPS domain.

After DNS:

```bash
curl -f https://docs.fermi.trade/healthz
curl -f https://docs.fermi.trade/oauth/status
```

Verify an article, search, and `/admin/` in a browser. Log in, make a small draft,
confirm its GitHub change, then discard it or publish through the editorial flow.
Check that a published change appears after the next update timer run.

## Editing and publication

Visit <https://docs.fermi.trade/admin/> and sign in with GitHub. The editor lists
all existing Markdown pages and supports Markdown and rich-text editing, image
uploads, and drafts. Publishing merges approved content to `main`, subject to
GitHub branch protection. If branch protection requires checks/reviews, finish
the pull request on GitHub. The final website rendering is authoritative; the
editor preview does not reproduce the complete Starlight layout.

The VM checks `main` every two minutes. It only fast-forwards a clean checkout.
Failed builds leave the previous site running and are retried. Local source edits
stop updates rather than being overwritten. CI also builds and checks pull requests.
This pull-based deployment avoids exposing SSH deployment credentials to CI.
It deploys `main`; enable branch protection if CI must gate publication.

Add a new numbered root Markdown file to include a page in the build and editor.
Add its slug (filename without number or `.md`) to `site.config.mjs` for sidebar
navigation. Root files remain directly readable on GitHub. Deployment instructions
such as this file are excluded from the public documentation and editor.

## Operations

Run these commands from the clone:

```bash
sudo docker compose --env-file /etc/fermi-docs/config.env ps
sudo docker compose --env-file /etc/fermi-docs/config.env logs --tail 50 web
sudo systemctl status fermi-docs-update.timer
sudo journalctl -u fermi-docs-update.service --since today
sudo systemctl start fermi-docs-update.service
```

Docker restarts the containers after VM reboots. The systemd timer restarts
automatically. Keep the checkout at its installed path; moving it requires rerunning
setup to refresh the timer's working directory. Setup can be rerun to rebuild or
refresh configuration. It does not change DNS or GCP resources.

Rollback content by reverting the bad commit on GitHub. To pause automatic updates,
run `sudo systemctl disable --now fermi-docs-update.timer`. A container deployment
failure after a successful build may need operator recovery; inspect Compose status
and logs, correct the cause, then rerun setup. Automated updates execute trusted
build code from `main`, so restrict repository write/merge permissions accordingly.

Back up `/etc/fermi-docs/config.env` securely and keep a record of the VM's firewall
and static IP configuration. GitHub retains the content history. OAuth pending
logins are held only in memory; users restart login if the auth container restarts.

## Local development

Use Node 24:

```bash
npm ci
npm run dev
npm test
npm run build
npm run check:site
npm run preview
```

Restart the development server after editing root Markdown to regenerate content.
Search is indexed by the production build; test it with `npm run preview`.
The built-in tests validate OAuth state, expiry, permission checks, error handling,
and the popup protocol with mocked GitHub responses. Real GitHub login requires
the OAuth app and working HTTPS/DNS and is a separate deployment check.
