#!/usr/bin/env bash
# Creates the Rallly secrets from the environment, so no secret ever lands in
# a file or shell history. Re-running keeps SECRET_PASSWORD (rotating it
# would sign everyone out) and updates the SMTP password.
#   RALLLY_SMTP_PWD  password of rallly@firemetrics.ai; defaults to SMTP_PWD
#                    from ~/src/rally/.env (gitignored)
#   RALLLY_ADMIN_EMAIL  INITIAL_ADMIN_EMAIL; defaults to the value already in
#                    the secret (kept out of the repo, it is a personal address)
#   GHCR_TOKEN       token with read:packages (default: `gh auth token`)
set -euo pipefail
: "${KUBECONFIG:=$HOME/.kube/hetzner-k3s.yaml}"; export KUBECONFIG
env_file="$(cd "$(dirname "$0")/../.." && pwd)/.env"
if [ -z "${RALLLY_SMTP_PWD:-}" ] && [ -f "$env_file" ]; then
  RALLLY_SMTP_PWD=$(python3 -I -c '
import shlex, sys
for line in open(sys.argv[1]):
    k, _, v = line.strip().partition("=")
    if k == "SMTP_PWD":
        print((shlex.split(v) or [""])[0], end="")' "$env_file")
fi
: "${RALLLY_SMTP_PWD:?set RALLLY_SMTP_PWD or SMTP_PWD in $env_file}"
ns=rallly

secret_password=$(kubectl -n "$ns" get secret rallly-app -o jsonpath='{.data.SECRET_PASSWORD}' 2>/dev/null | base64 -d || true)
[ -n "$secret_password" ] || secret_password=$(openssl rand -hex 32)

admin_email=${RALLLY_ADMIN_EMAIL:-$(kubectl -n "$ns" get secret rallly-app -o jsonpath='{.data.INITIAL_ADMIN_EMAIL}' 2>/dev/null | base64 -d || true)}
: "${admin_email:?set RALLLY_ADMIN_EMAIL}"

kubectl -n "$ns" create secret generic rallly-app \
  --from-file=SECRET_PASSWORD=<(printf '%s' "$secret_password") \
  --from-file=SMTP_PWD=<(printf '%s' "$RALLLY_SMTP_PWD") \
  --from-file=INITIAL_ADMIN_EMAIL=<(printf '%s' "$admin_email") \
  --dry-run=client -o yaml | kubectl apply -f -

token=${GHCR_TOKEN:-$(gh auth token)}
user=$(gh api user --jq .login)
dockerconfig=$(printf '%s:%s' "$user" "$token" | python3 -c '
import base64, json, sys
auth = sys.stdin.read()
print(json.dumps({"auths": {"ghcr.io": {"auth": base64.b64encode(auth.encode()).decode()}}}))')
kubectl -n "$ns" create secret generic ghcr-pull \
  --type=kubernetes.io/dockerconfigjson \
  --from-file=.dockerconfigjson=<(printf '%s' "$dockerconfig") \
  --dry-run=client -o yaml | kubectl apply -f -
