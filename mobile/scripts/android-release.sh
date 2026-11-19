#!/usr/bin/env bash
set -euo pipefail

version_code=${1:-}
output=${2:-}
if [[ ! "$version_code" =~ ^[1-9][0-9]{0,9}$ ]] || (( version_code > 2100000000 )) || [[ "$output" != /*.apk ]]; then
  echo 'Usage: bash scripts/android-release.sh <versionCode> </absolute/path/to/release.apk>' >&2
  exit 2
fi

: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory.}"
: "${SAFAR_ANDROID_KEYSTORE:?Set the absolute path to the company keystore.}"
: "${SAFAR_ANDROID_KEY_ALIAS:?Set the signing key alias.}"
: "${SAFAR_ANDROID_KEYSTORE_PASSWORD:?Provide the keystore password in the environment.}"
export SAFAR_ANDROID_KEY_PASSWORD="${SAFAR_ANDROID_KEY_PASSWORD:-$SAFAR_ANDROID_KEYSTORE_PASSWORD}"
signer="$ANDROID_HOME/build-tools/36.0.0/apksigner"
[[ "$SAFAR_ANDROID_KEYSTORE" = /* && -r "$SAFAR_ANDROID_KEYSTORE" && -x "$signer" ]]

cd "$(dirname "$0")/.."
npm run build
npx --no-install cap sync android
(
  cd android
  ./gradlew assembleRelease -PsafarVersionCode="$version_code"
)

mkdir -p "$(dirname "$output")"
sign_dir="$(mktemp -d "$(dirname "$output")/.safar-sign-XXXXXXXX")"
trap 'rm -rf -- "$sign_dir"' EXIT
"$signer" sign \
  --ks "$SAFAR_ANDROID_KEYSTORE" --ks-key-alias "$SAFAR_ANDROID_KEY_ALIAS" \
  --ks-pass env:SAFAR_ANDROID_KEYSTORE_PASSWORD --key-pass env:SAFAR_ANDROID_KEY_PASSWORD \
  --out "$sign_dir/release.apk" android/app/build/outputs/apk/release/app-release-unsigned.apk
"$signer" verify --print-certs "$sign_dir/release.apk"
mv -- "$sign_dir/release.apk" "$output"
