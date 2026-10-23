#!/usr/bin/env bash
# Fresh Debian/Ubuntu VM: sudo ./setup.sh
set -euo pipefail

configure_only=0
no_editor=0
for option in "$@"; do
  case "$option" in
    --configure) configure_only=1 ;;
    --no-editor) no_editor=1 ;;
    --help|-h)
      echo 'Usage: sudo ./setup.sh [--configure] [--no-editor]'
      echo 'Installs Docker, builds docs, starts Caddy and editor auth, and enables updates.'
      echo '--configure changes saved OAuth settings and restarts services.'
      echo '--no-editor explicitly starts public docs without GitHub editor login.'
      exit 0 ;;
    *) echo "Unknown option: $option" >&2; exit 1 ;;
  esac
done
if [[ $EUID -ne 0 ]]; then
  echo 'Run this script with sudo: sudo ./setup.sh' >&2
  exit 1
fi

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
if [[ ! "$repo_dir" =~ ^/[A-Za-z0-9_./-]+$ ]]; then
  echo 'Clone into a path without spaces or shell metacharacters, such as /opt/fermi-docs.' >&2; exit 1
fi
if [[ ! -d "$repo_dir/.git" ]]; then echo 'Run setup from a Git clone, not a ZIP download.' >&2; exit 1; fi
if [[ ! -d /run/systemd/system ]]; then echo 'This installer needs a VM running systemd.' >&2; exit 1; fi
source /etc/os-release
case "$ID" in ubuntu|debian) ;; *) echo 'Supported operating systems: Ubuntu and Debian.' >&2; exit 1 ;; esac

export DEBIAN_FRONTEND=noninteractive
if [[ $configure_only -eq 0 ]]; then
  apt-get update
  apt-get install -y ca-certificates curl git gnupg util-linux
  if ! docker compose version >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl --fail --silent --show-error "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/fermi-docker.asc
    chmod a+r /etc/apt/keyrings/fermi-docker.asc
    arch=$(dpkg --print-architecture)
    printf 'deb [arch=%s signed-by=/etc/apt/keyrings/fermi-docker.asc] https://download.docker.com/linux/%s %s stable\n' \
      "$arch" "$ID" "$VERSION_CODENAME" > /etc/apt/sources.list.d/fermi-docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
fi
command -v docker >/dev/null || { echo 'Docker is missing; run setup without --configure.' >&2; exit 1; }
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
export DOCKER_HOST=unix:///var/run/docker.sock
systemctl enable --now docker

install -d -m 0700 /etc/fermi-docs
install -d -m 0755 /var/lib/fermi-docs
config_file=/etc/fermi-docs/config.env
# This is our root-owned, mode-0600 configuration, not repository content.
# shellcheck disable=SC1090
if [[ -f "$config_file" ]]; then source "$config_file"; fi
DOCS_DOMAIN=${DOCS_DOMAIN:-docs.fermi.trade}
OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID:-}
OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET:-}
OAUTH_SCOPE=${OAUTH_SCOPE:-repo}
if [[ $no_editor -eq 1 ]]; then
  OAUTH_CLIENT_ID=''; OAUTH_CLIENT_SECRET=''
elif [[ $configure_only -eq 1 || -z "$OAUTH_CLIENT_ID" || -z "$OAUTH_CLIENT_SECRET" ]]; then
  if [[ ! -t 0 ]]; then
    echo 'Provide OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET securely, run interactively, or explicitly use --no-editor.' >&2
    exit 1
  fi
  echo "Create a GitHub OAuth App: https://github.com/settings/applications/new"
  echo "Homepage: https://$DOCS_DOMAIN"
  echo "Authorization callback URL: https://$DOCS_DOMAIN/oauth/callback"
  read -r -p 'OAuth client ID (Enter keeps existing): ' input
  OAUTH_CLIENT_ID=${input:-$OAUTH_CLIENT_ID}
  read -r -s -p 'OAuth client secret (hidden; Enter keeps existing): ' input
  echo
  OAUTH_CLIENT_SECRET=${input:-$OAUTH_CLIENT_SECRET}
  unset input
  if [[ -z "$OAUTH_CLIENT_ID" || -z "$OAUTH_CLIENT_SECRET" ]]; then
    echo 'Both OAuth values are required for the editor. Use --no-editor for public docs only.' >&2; exit 1
  fi
fi
[[ "$DOCS_DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$ ]] || { echo 'Invalid docs domain.' >&2; exit 1; }
[[ "$OAUTH_CLIENT_ID" =~ ^[a-zA-Z0-9_.-]*$ && "$OAUTH_CLIENT_SECRET" =~ ^[a-zA-Z0-9_-]*$ ]] || { echo 'Unexpected characters in OAuth configuration.' >&2; exit 1; }
[[ "$OAUTH_SCOPE" == repo || "$OAUTH_SCOPE" == public_repo ]] || { echo 'OAUTH_SCOPE must be repo or public_repo.' >&2; exit 1; }
umask 077
config_temp=$(mktemp /etc/fermi-docs/config.XXXXXX)
printf 'DOCS_DOMAIN=%s\nOAUTH_CLIENT_ID=%s\nOAUTH_CLIENT_SECRET=%s\nOAUTH_SCOPE=%s\n' \
  "$DOCS_DOMAIN" "$OAUTH_CLIENT_ID" "$OAUTH_CLIENT_SECRET" "$OAUTH_SCOPE" > "$config_temp"
mv "$config_temp" "$config_file"
chmod 0600 "$config_file"
unset OAUTH_CLIENT_SECRET

cd "$repo_dir"
docker compose --env-file "$config_file" up --build -d --wait --wait-timeout 180
curl --fail --silent --show-error --noproxy 127.0.0.1 http://127.0.0.1/healthz
git -c safe.directory="$repo_dir" rev-parse HEAD > /var/lib/fermi-docs/deployed-commit

cat > /etc/systemd/system/fermi-docs-update.service <<EOF
[Unit]
Description=Rebuild Fermi documentation after GitHub changes
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$repo_dir
ExecStart=/bin/bash $repo_dir/deploy/update.sh
TimeoutStartSec=30min
EOF
cat > /etc/systemd/system/fermi-docs-update.timer <<'EOF'
[Unit]
Description=Check for Fermi documentation updates every two minutes

[Timer]
OnBootSec=2min
OnUnitInactiveSec=2min
RandomizedDelaySec=15s
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now fermi-docs-update.timer
echo
echo "Fermi docs are running. Reserve a static VM IP and point $DOCS_DOMAIN to it."
echo 'Allow inbound TCP 80/443 in the GCP firewall. Caddy obtains HTTPS after DNS resolves.'
echo 'You can check the public docs before DNS at http://VM_EXTERNAL_IP/.'
if [[ $no_editor -eq 1 ]]; then echo 'Editor login is disabled. Enable it later with sudo ./setup.sh --configure.'; fi
