import assert from "node:assert/strict";
import {
  getBgaFourPlayerBanlistStatus,
  getRealCardCatalog,
  getRealCardDetail,
  normalizeBgaPrintedId,
  type RealCardCatalogFetch
} from "../src/app/real-card-catalog-api.ts";

const graphQlCardsByDeck: Record<string, unknown[]> = {
  "20023": [
    {
      id: "201014",
      literalID: "A014",
      printedID: "A014",
      revisionID: "2",
      deckID: "20023",
      nameEn: "Carpenter's Hammer",
      nameJa: "大工の槌",
      cost: "木材1",
      prerequisite: null,
      description: "すぐに木の家を1部屋増築できる。",
      playAgricolaCardID: "9001",
      victoryPoint: 0,
      deck: { id: "20023", nameEn: "A-Deck" },
      cardType: { id: "102", nameEn: "Minor Improvement" },
      products: [{ id: "10019", nameEn: "Artifex Deck" }]
    },
    {
      id: "201033",
      literalID: "A033",
      printedID: "A033*",
      revisionID: "2",
      deckID: "20023",
      nameEn: "Big Country",
      nameJa: "大農場",
      cost: null,
      prerequisite: null,
      description: "農場を広げる。",
      playAgricolaCardID: null,
      victoryPoint: 0,
      deck: { id: "20023", nameEn: "A-Deck" },
      cardType: { id: "102", nameEn: "Minor Improvement" },
      products: [{ id: "10017", nameEn: "Agricola (Revised Edition)" }]
    }
  ],
  "20024": [
    {
      id: "202040",
      literalID: "B040",
      printedID: "B040",
      revisionID: "2",
      deckID: "20024",
      nameEn: "Brewery Pond",
      nameJa: "醸造池",
      cost: null,
      prerequisite: null,
      description: "池から食料を得る。",
      playAgricolaCardID: "9002",
      victoryPoint: 1,
      deck: { id: "20024", nameEn: "B-Deck" },
      cardType: { id: "102", nameEn: "Minor Improvement" },
      products: [{ id: "10027", nameEn: "Bubulcus Deck" }]
    }
  ],
  "20025": [],
  "20026": []
};

const veronaTurtle = String.raw`
<http://agricola.veronahe.no/e-guest-room>    a <http://agricola.veronahe.no/MinorImprovement> ;
    <http://agricola.veronahe.no/cardText> "You receive room for one guest token." ;
    <http://agricola.veronahe.no/deck> <http://agricola.veronahe.no/deck_RevisedE> ;
    <http://agricola.veronahe.no/hasCost> <http://agricola.veronahe.no/1w> ;
    <http://agricola.veronahe.no/id> "e-guest-room" ;
    rdfs:label "Guest Room" .

<http://agricola.veronahe.no/e-blackberry-farmer>    a <http://agricola.veronahe.no/Occupation> ;
    <http://agricola.veronahe.no/cardText> "Whenever you sow, you may also plant food." ;
    <http://agricola.veronahe.no/deck> <http://agricola.veronahe.no/deck_RevisedE> ;
    <http://agricola.veronahe.no/id> "e-blackberry-farmer" ;
    rdfs:label "Blackberry Farmer" .

<http://agricola.veronahe.no/1w>    a <http://agricola.veronahe.no/CostPermutation> ;
    <http://agricola.veronahe.no/wood> "1"^^xsd:integer ;
    rdfs:label "1 wood" .
`;

const playAgricolaHtml = String.raw`
<table>
<tr>
<td><a href='Cards/xminorCarpentersHammer_9001_1.jpg'>[View]</a>
<input type='hidden' id='id1' value=9001>
<input type='hidden' id='file1' value='xminorCarpentersHammer_9001_1.jpg'></td>
<td id='crddeck1'>A</td>
<td id='crdtype1'>minor</td>
<td id='crdname1'>Carpenter's Hammer</td>
<td id='crdtext1'>Immediately build 1 room in your wooden hut.</td>
<td id='crdcost1'>1 wood</td>
<td id='crdvps1'>0</td>
<td id='crdprereq1'></td>
</tr>
</table>
`;

const fakeFetch: RealCardCatalogFetch = async (input, init) => {
  const url = String(input);

  if (url === "https://api.db.agricolajp.dev/graphql") {
    const body = JSON.parse(String(init?.body));
    const deckId = String(body.variables.deckId);
    const edges = (graphQlCardsByDeck[deckId] ?? []).map((node) => ({ node }));

    return jsonResponse({
      data: {
        cards: {
          totalCount: edges.length,
          edges
        }
      }
    });
  }

  if (url === "https://agricola.veronahe.no/api/export-rdf") {
    return textResponse(veronaTurtle, "text/turtle; charset=utf-8");
  }

  if (url === "http://play-agricola.com/Agricola/Cards/index.php?id=9001") {
    return textResponse(playAgricolaHtml, "text/html; charset=UTF-8");
  }

  throw new Error(`Unexpected test fetch: ${url}`);
};

const koreanOverrides = [
  {
    printedId: "A14",
    name: "\ubaa9\uc218\uc758 \ub9dd\uce58",
    effectText: "\uc989\uc2dc \ub098\ubb34\uc9d1\uc5d0 \ubc29 1\uac1c\ub97c \ub9cc\ub4ed\ub2c8\ub2e4.",
    costRaw: "\ub098\ubb34 1\uac1c",
    sourceRef: "test-ko-source"
  }
];

assert.equal(normalizeBgaPrintedId("A014*"), "A14");
assert.deepEqual(getBgaFourPlayerBanlistStatus("A14"), {
  strong: true,
  weak: false,
  livingHand: false
});
assert.equal(getBgaFourPlayerBanlistStatus("B40").strong, false, "B40 is not banned in 3-4 player games.");

const catalog = await getRealCardCatalog({ decks: ["A", "B", "E"], limit: 20 }, { fetch: fakeFetch });
assert.equal(catalog.cards.length, 5);
assert.equal(catalog.sourceAttributions.length, 5);

const hammer = catalog.cards.find((card) => card.printedId === "A14");
assert.ok(hammer, "A14 should be included from AgricolaDB.");
assert.equal(hammer.name.en, "Carpenter's Hammer");
assert.equal(hammer.name.ja, undefined);
assert.equal(hammer.translationStatus, "ko_missing");
assert.equal(hammer.effectText, undefined);
assert.equal(hammer.effectLocale, undefined);
assert.equal(hammer.costRaw, undefined);
assert.equal(hammer.sourceCostRaw, undefined);
assert.equal(hammer.sourceEffectLocale, undefined);
assert.equal(hammer.bgaBanlist4p.strong, true);
assert.equal(hammer.image?.sourcePageUrl, "http://play-agricola.com/Agricola/Cards/index.php?id=9001");

const sourceCatalog = await getRealCardCatalog(
  { decks: ["A"], limit: 20 },
  { fetch: fakeFetch, includeSourceText: true }
);
const sourceHammer = sourceCatalog.cards.find((card) => card.printedId === "A14");
assert.ok(sourceHammer, "A14 source detail should be available when requested.");
assert.equal(sourceHammer.name.ja, "大工の槌");
assert.equal(sourceHammer.sourceCostRaw, "木材1");
assert.equal(sourceHammer.sourceEffectLocale, "ja");

const breweryPond = catalog.cards.find((card) => card.printedId === "B40");
assert.ok(breweryPond, "B40 should be included from AgricolaDB.");
assert.equal(breweryPond.bgaBanlist4p.strong, false);

const guestRoom = catalog.cards.find((card) => card.printedId === "E22");
assert.ok(guestRoom, "E22 should be inferred from the BGA banlist name mapping.");
assert.equal(guestRoom.bgaBanlist4p.strong, true);
assert.equal(guestRoom.sourceSystem, "agricola-veronahe-rdf");
assert.equal(guestRoom.translationStatus, "ko_missing");
assert.equal(guestRoom.effectText, undefined);
assert.equal(guestRoom.sourceEffectText, undefined);
assert.equal(guestRoom.sourceEffectLocale, undefined);

const koreanCatalog = await getRealCardCatalog(
  { decks: ["A"], query: "\ubaa9\uc218\uc758 \ub9dd\uce58", limit: 20 },
  { fetch: fakeFetch, koreanOverrides }
);
const koreanHammer = koreanCatalog.cards.find((card) => card.printedId === "A14");
assert.ok(koreanHammer, "Korean override should make A14 searchable by Korean name.");
assert.equal(koreanHammer.name.ko, "\ubaa9\uc218\uc758 \ub9dd\uce58");
assert.equal(koreanHammer.translationStatus, "ko_available");
assert.equal(koreanHammer.effectLocale, "ko-KR");
assert.equal(koreanHammer.effectText, "\uc989\uc2dc \ub098\ubb34\uc9d1\uc5d0 \ubc29 1\uac1c\ub97c \ub9cc\ub4ed\ub2c8\ub2e4.");
assert.equal(koreanHammer.costRaw, "\ub098\ubb34 1\uac1c");
assert.ok(koreanHammer.sourceRefs.includes("test-ko-source"));

const hammerDetail = await getRealCardDetail("A14", { fetch: fakeFetch });
assert.ok(hammerDetail, "A14 detail should resolve by normalized BGA printed id.");
assert.equal(hammerDetail.effectText, undefined);
assert.equal(hammerDetail.costRaw, undefined);
assert.equal(hammerDetail.sourceEffectText, undefined);
assert.equal(hammerDetail.sourceEffectLocale, undefined);
assert.equal(hammerDetail.sourceCostRaw, undefined);
assert.equal(
  hammerDetail.image?.url,
  "http://play-agricola.com/Agricola/Cards/Cards/xminorCarpentersHammer_9001_1.jpg"
);
assert.ok(!hammerDetail.image?.url.includes("/public/"), "card images must not point at local public assets.");

const sourceHammerDetail = await getRealCardDetail("A14", { fetch: fakeFetch, includeSourceText: true });
assert.ok(sourceHammerDetail, "A14 source detail should resolve.");
assert.equal(sourceHammerDetail.sourceEffectText, "Immediately build 1 room in your wooden hut.");
assert.equal(sourceHammerDetail.sourceEffectLocale, "en");
assert.equal(sourceHammerDetail.sourceCostRaw, "1 wood");

const koreanHammerDetail = await getRealCardDetail("A14", {
  fetch: fakeFetch,
  koreanOverrides,
  includeSourceText: true
});
assert.ok(koreanHammerDetail, "A14 detail with Korean override should resolve.");
assert.equal(koreanHammerDetail.effectText, "\uc989\uc2dc \ub098\ubb34\uc9d1\uc5d0 \ubc29 1\uac1c\ub97c \ub9cc\ub4ed\ub2c8\ub2e4.");
assert.equal(koreanHammerDetail.costRaw, "\ub098\ubb34 1\uac1c");
assert.equal(koreanHammerDetail.sourceEffectText, "Immediately build 1 room in your wooden hut.");
assert.equal(koreanHammerDetail.sourceCostRaw, "1 wood");

const eDetail = await getRealCardDetail("E22", { fetch: fakeFetch });
assert.ok(eDetail, "E deck detail should resolve by inferred printed id.");
assert.equal(eDetail.name.en, "Guest Room");
assert.equal(eDetail.costRaw, undefined);
assert.equal(eDetail.sourceCostRaw, undefined);

console.log("Real card catalog API contract passed.");

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function textResponse(payload: string, contentType: string): Response {
  return new Response(payload, {
    status: 200,
    headers: { "content-type": contentType }
  });
}
