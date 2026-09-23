#!/usr/bin/env bash

PKG="$1"

if [ -z "$PKG" ]; then
  echo "Usage: ./approve-scripts.sh <package>"
  exit 1
fi

PKG_PATH="node_modules/$PKG/package.json"

if [ ! -f "$PKG_PATH" ]; then
  echo "Package '$PKG' not found in node_modules."
  exit 1
fi

echo "Reading scripts from $PKG_PATH..."
SCRIPTS=$(jq -r '.scripts // empty' "$PKG_PATH")

if [ -z "$SCRIPTS" ]; then
  echo "No scripts found for '$PKG'."
  exit 0
fi

echo "Scripts found:"
echo "$SCRIPTS"
echo

read -p "Approve these scripts? (y/n): " ANSWER

if [[ "$ANSWER" == "y" || "$ANSWER" == "Y" ]]; then
  mkdir -p .approved-scripts
  echo "$SCRIPTS" > ".approved-scripts/$PKG.json"
  echo "Approved scripts saved to .approved-scripts/$PKG.json"
else
  echo "Scripts NOT approved."
fi
