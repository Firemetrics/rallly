#!/usr/bin/env bash
# Creates the Rallly secrets from the environment, so no secret ever lands in
# a file or shell history. Re-running keeps SECRET_PASSWORD (rotating it
# would sign everyone out) and updates the SMTP password.
#   RALLLY_SMTP_PWD  password of rallly@firemetrics.ai; defaults to SMTP_PWD
#                    from ~/src/rally/.env (gitignored)
#   S3_ENDPOINT, S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID,
#   S3_SECRET_ACCESS_KEY  Hetzner Object Storage for uploads; read from .env
#   RALLLY_ADMIN_EMAIL  INITIAL_ADMIN_EMAIL; defaults to the value already in
#                    the secret (kept out of the repo, it is a personal address)
#   GHCR_TOKEN       classic token with only read:packages; read from .env,
#                    falls back to `gh auth token` (broad scopes, avoid)
set -euo pipefail
: "${KUBECONFIG:=$HOME/.kube/hetzner-k3s.yaml}"; export KUBECONFIG
env_file="$(cd "$(dirname "$0")/../.." && pwd)/.env"
# Prints one value from the gitignored .env, unquoted; empty if missing.
dotenv() {
  [ -f "$env_file" ] || return 0
  python3 -I -c '
import shlex, sys
for line in open(sys.argv[1]):
    k, _, v = line.strip().partition("=")
    if k == sys.argv[2]:
        print((shlex.split(v) or [""])[0], end="")' "$env_file" "$1"
}
RALLLY_SMTP_PWD=${RALLLY_SMTP_PWD:-$(dotenv SMTP_PWD)}
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

# An env file, not --from-literal, so the keys never show up in `ps`.
s3_env=$(umask 077; mktemp)
trap 'rm -f "$s3_env"' EXIT
for key in S3_ENDPOINT S3_BUCKET_NAME S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
  value=${!key:-$(dotenv "$key")}
  : "${value:?set $key (env or $env_file)}"
  printf '%s=%s\n' "$key" "$value" >> "$s3_env"
done
kubectl -n "$ns" create secret generic rallly-s3 --from-env-file="$s3_env" \
  --dry-run=client -o yaml | kubectl apply -f -

token=${GHCR_TOKEN:-$(dotenv GHCR_TOKEN)}
if [ -z "$token" ]; then
  echo "warning: GHCR_TOKEN not set, using the broad gh CLI token for ghcr-pull" >&2
  token=$(gh auth token)
fi
user=$(gh api user --jq .login)
dockerconfig=$(printf '%s:%s' "$user" "$token" | python3 -c '
import base64, json, sys
auth = sys.stdin.read()
print(json.dumps({"auths": {"ghcr.io": {"auth": base64.b64encode(auth.encode()).decode()}}}))')
kubectl -n "$ns" create secret generic ghcr-pull \
  --type=kubernetes.io/dockerconfigjson \
  --from-file=.dockerconfigjson=<(printf '%s' "$dockerconfig") \
  --dry-run=client -o yaml | kubectl apply -f -
