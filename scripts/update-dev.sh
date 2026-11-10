#!/usr/bin/env bash
# Build origin/dev in an isolated checkout; publish only successful builds.
set -Eeuo pipefail
export GIT_TERMINAL_PROMPT=0

repository="${BRANCHLAB_REPOSITORY:-https://github.com/sinikebe/branchlab.git}"
checkout="${BRANCHLAB_CHECKOUT:-/root/branchlab-dev}"
state="${BRANCHLAB_STATE:-/root/.local/share/branchlab}"
controller="$(realpath "$(dirname "${BASH_SOURCE[0]}")/..")"
checkout="$(realpath -m "$checkout")"
state="$(realpath -m "$state")"

fail() { printf 'BranchLab: %s\n' "$*" >&2; exit 1; }
# Reject both nesting directions: clean must never touch the controller or state.
[[ "$checkout" != / && "$checkout" != "${HOME:-/root}" ]] || fail "checkout de déploiement non sûr"
[[ "$checkout/" != "$controller/"* && "$controller/" != "$checkout/"* ]] || fail "le checkout de déploiement doit être séparé du dépôt de travail"
[[ "$checkout/" != "$state/"* && "$state/" != "$checkout/"* ]] || fail "les constructions et le checkout doivent être séparés"

mkdir -p "$state/releases"
exec 9>"$state/update.lock"
flock -n 9 || exit 0

marker="$checkout/.git/branchlab-deployment-checkout"
if [[ -d "$checkout/.git" ]]; then
  [[ -f "$marker" ]] || fail "checkout existant sans marqueur de déploiement ; aucune modification effectuée"
  [[ "$(cat "$marker")" == branchlab-managed-checkout-v1 ]] || fail "marqueur de déploiement invalide"
  [[ "$(git -C "$checkout" remote get-url origin)" == "$repository" ]] || fail "le dépôt distant du checkout a changé"
else
  [[ ! -e "$checkout" ]] || fail "le chemin de déploiement existe déjà ; choisir un dossier absent"
  git clone --single-branch --branch dev --no-checkout "$repository" "$checkout"
  printf 'branchlab-managed-checkout-v1\n' > "$marker"
fi
git -C "$checkout" fetch --quiet origin dev
revision="$(git -C "$checkout" rev-parse FETCH_HEAD)"
[[ "$revision" =~ ^[0-9a-f]{40,64}$ ]] || fail "révision Git invalide"
current="$(readlink "$state/current" 2>/dev/null || true)"
if [[ "$current" == "$state/releases/$revision" && -f "$state/current/index.html" ]]; then
  exit 0
fi

# This checkout is reserved for deployment; never point it at your working copy.
git -C "$checkout" checkout --detach --force "$revision"
git -C "$checkout" clean -ffd -e node_modules
cd "$checkout"
npm ci --no-audit --no-fund
npm run check
npm run test:e2e
npm run build
test -f dist/index.html

staging="$(mktemp -d "$state/releases/.staging.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
cp -a dist/. "$staging/"
printf '{"commit":"%s","branch":"dev"}\n' "$revision" > "$staging/version.json"
if [[ -d "$state/releases/$revision" ]]; then
  rm -rf "$staging"
else
  mv "$staging" "$state/releases/$revision"
fi
ln -s "$state/releases/$revision" "$state/.current.$$"
mv -Tf "$state/.current.$$" "$state/current"
printf 'Version dev active: %s\n' "$revision"
