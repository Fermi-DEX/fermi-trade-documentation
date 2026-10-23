#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$repo_dir"
exec 9>/var/lib/fermi-docs/update.lock
flock -n 9 || exit 0

# Use the checkout owner's existing Git credentials, including private-repo SSH keys.
owner=$(stat -c %U "$repo_dir/.git")
git_as_owner() {
  if [[ "$owner" == root ]]; then git -c safe.directory="$repo_dir" "$@";
  else runuser -u "$owner" -- git -c safe.directory="$repo_dir" "$@"; fi
}
if [[ $(git_as_owner branch --show-current) != main ]]; then echo 'Updates require the main branch; no changes made.' >&2; exit 1; fi
if [[ -n $(git_as_owner status --porcelain --untracked-files=no) ]]; then echo 'Tracked local changes found; refusing to overwrite them.' >&2; exit 1; fi
git_as_owner fetch origin main
git_as_owner merge --ff-only origin/main
head=$(git_as_owner rev-parse HEAD)
deployed=$(cat /var/lib/fermi-docs/deployed-commit 2>/dev/null || true)
if [[ "$head" == "$deployed" ]]; then exit 0; fi

# A failed build leaves the previous containers running and is retried next time.
docker compose --env-file /etc/fermi-docs/config.env up --build -d --wait --wait-timeout 180
curl --fail --silent --show-error --noproxy 127.0.0.1 http://127.0.0.1/healthz
printf '%s\n' "$head" > /var/lib/fermi-docs/deployed-commit
echo "Deployed documentation commit $head"
