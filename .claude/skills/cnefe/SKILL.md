---
name: cnefe
description: Download the IBGE CNEFE (Censo 2022) address file for a city and regenerate the street module the geocoder uses. Use when adding a city, refreshing Apucarana's streets, or when asked to fetch IBGE/CNEFE data.
argument-hint: "[\"City, UF\"] (default: \"Apucarana, PR\")"
---

# CNEFE: IBGE addresses for the geocoder

Background: `docs/dados-ibge.md` (where the data comes from, why it is open), ADR 0005 (why the CNEFE) and ADR 0006 (why a bundled module and not a table).

The city argument is `"<name>, <UF>"`, e.g. `"Ponta Grossa, PR"`. Default `"Apucarana, PR"`. Accents and case do not matter. The script resolves the IBGE code through the IBGE localities API.

## Steps

1. Download. Writes `data/cnefe/<code>_<NAME>.csv` (raw IBGE file, Latin-1, kept as is):
   ```bash
   node scripts/cnefe.mjs download "$ARGUMENTS"
   ```
   Omit the argument for Apucarana. On "No city ... in UF", check the spelling with the user. Do not guess another city.

2. Generate the module. Writes `convex/cnefe/<code>.ts`:
   ```bash
   node scripts/cnefe.mjs build "$ARGUMENTS"
   ```

3. Regenerate Convex types and run the checks:
   ```bash
   npm run codegen && npm test && npm run typecheck && npm run lint
   ```

4. Report: city, IBGE code, number of streets, CSV and module sizes, and `git diff --stat`.

## A new city (not a refresh)

The V1 serves Apucarana only. `convex/bot/geocode.ts` imports `convex/cnefe/4101408.ts` directly. Downloading another city does not make the bot serve it. Before wiring a second city, read "Quando virar multi-cidade" in ADR 0006: the RAM limit of the Convex runtime (64 MiB), the municipality polygon, the Google `components` and the agencies all change together. Tell the user this instead of editing the geocoder silently.

## Rules

- Commit the CSV and the generated module together. The deploy and the CI need the module.
- Never edit `convex/cnefe/*.ts` by hand. Rerun `build`.
- The download is the IBGE's public FTP (open data, see `docs/dados-ibge.md`). No credentials needed.
