# 07 Real Card Catalog Source Note

## Scope

This branch adds a read-only real card catalog layer for BGA-targeted
Agricola decks A-E.

The catalog is intentionally separate from the draft scoring engine:

- Draft scoring still uses the existing normalized/manual data contracts.
- Real card lookup is for browsing card identity, text, cost, image links,
  and BGA 4-player banlist status.
- Strategy tags remain deferred, but each returned card includes an empty
  `strategyExtension.tagIds` slot for later curation.

## Sources

The catalog combines external metadata sources and a Korean text overlay path:

- AgricolaDB GraphQL: A-D revised deck identity, names, raw source text/cost,
  prerequisites, product metadata, and Play-Agricola IDs.
- Agricola Card Ontology RDF: Revised E deck identity and raw source card text.
- Play-Agricola: external rendered image URL and raw English detail text when
  a Play-Agricola card ID is available.
- Woongi tierlist spreadsheet: Korean card text overlay source once a reviewed
  BGA printed-id mapping is available.

BGA 4-player banlist flags are encoded from:

- `https://en.doc.boardgamearena.com/Gamehelpagricola`

## Image Policy

Card images are not downloaded into `public/`, `data/`, or any other local
project directory.

The API returns external image metadata only:

```ts
type RealCardExternalImage = {
  storage: "external";
  sourceRef: string;
  sourcePageUrl?: string;
  url?: string;
};
```

If an external rendered card image cannot be found, callers still receive the
source page URL when available.

## API

List endpoint:

```text
GET /api/real-cards?deck=A&limit=50
GET /api/real-cards?decks=A,B,C,D,E&q=carpenter
GET /api/real-cards?banlist4p=strong
```

Detail endpoint:

```text
GET /api/real-cards/A14
GET /api/real-cards/E22
```

IDs prefer normalized BGA printed IDs, such as `A14` instead of `A014`.

User-facing text fields are Korean-only:

- `effectText`, `costRaw`, and `prerequisiteRaw` are populated only from a
  Korean override.
- `effectLocale` is `ko-KR` when Korean text is present.
- `translationStatus` is `ko_available` or `ko_missing`.
- Raw external source text is omitted by default. It is available only when
  `includeSourceText=true`, using `sourceEffectText`, `sourceEffectLocale`,
  `sourceCostRaw`, and `sourcePrerequisiteRaw`.

## Known Gaps

- A-E entries without a reviewed Korean override intentionally return no
  `effectText`/`costRaw` rather than falling back to Japanese or English.
- Until the Korean override mapping is complete, those entries may still carry
  external identity fields such as `name.en`; callers must treat
  `translationStatus=ko_missing` as not ready for Korean card browsing.
- The Woongi spreadsheet has Korean card names, effects, and costs for 683
  cards, but does not include BGA printed IDs. A reviewed mapping from
  printed ID to Woongi card ID is still required before using it as the default
  A-E Korean overlay.
- Revised E has RDF text and source page links, but no guaranteed rendered
  image URL.
- The BGA source page identifies E banlist cards by printed ID, but the RDF
  source does not expose all E printed IDs. The implementation maps the E
  banlist names currently needed for 4-player status.
