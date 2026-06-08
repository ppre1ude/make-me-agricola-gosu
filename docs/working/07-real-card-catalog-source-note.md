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

The catalog combines three external sources:

- AgricolaDB GraphQL: A-D revised deck identity, names, Japanese text, cost,
  prerequisites, product metadata, and Play-Agricola IDs.
- Agricola Card Ontology RDF: Revised E deck identity and English card text.
- Play-Agricola: external rendered image URL and English detail text when a
  Play-Agricola card ID is available.

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

## Known Gaps

- A-D effect text from AgricolaDB is Japanese unless a Play-Agricola detail
  page is available and parsed on detail lookup.
- Revised E has RDF text and source page links, but no guaranteed rendered
  image URL.
- The BGA source page identifies E banlist cards by printed ID, but the RDF
  source does not expose all E printed IDs. The implementation maps the E
  banlist names currently needed for 4-player status.
