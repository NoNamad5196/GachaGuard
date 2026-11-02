/**
 * Authoritative OtakuS Game Catalog & Resolution
 */

export const GAME_CATALOG = [
  {
    id: "genshin-impact",
    name: "원신",
    aliases: ["genshin", "genshin impact"],
    franchise_id: "genshin",
    color: "#5bbfdb",
  },
  {
    id: "honkai-star-rail",
    name: "붕괴: 스타레일",
    aliases: ["붕괴 스타레일", "스타레일", "honkai star rail", "starrail"],
    franchise_id: "honkai",
    color: "#a882e8",
  },
  {
    id: "wuthering-waves",
    name: "명조",
    aliases: ["명조: 워더링 웨이브", "wuthering waves", "wuwa"],
    franchise_id: "wuthering-waves",
    color: "#62c48a",
  },
  {
    id: "blue-archive",
    name: "블루 아카이브",
    aliases: ["블루아카이브", "blue archive"],
    franchise_id: "blue-archive",
    color: "#6ab0f0",
  },
  {
    id: "nikke",
    name: "승리의 여신: 니케",
    aliases: ["니케", "nikke", "승리의 여신 니케"],
    franchise_id: "nikke",
    color: "#e87090",
  },
  {
    id: "arknights",
    name: "명일방주",
    aliases: ["arknights"],
    franchise_id: "arknights",
    color: "#e8a870",
  },
  {
    id: "zenless-zone-zero",
    name: "젠레스 존 제로",
    aliases: ["젠레스", "zzz", "zenless zone zero"],
    franchise_id: null,
    color: "#b6d56a",
  },
  {
    id: "limbus-company",
    name: "림버스 컴퍼니",
    aliases: ["림버스", "limbus company"],
    franchise_id: null,
    color: "#df976a",
  },
];

export function normalizeGameName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\s:：·._-]+/g, "");
}

export function resolveGame(name, slug = "") {
  const normName = normalizeGameName(name || "");
  const normSlug = normalizeGameName(slug || "");

  const match = GAME_CATALOG.find((g) => {
    const normCatalogId = normalizeGameName(g.id);
    const normCatalogName = normalizeGameName(g.name);
    const normAliases = g.aliases.map(normalizeGameName);
    return (
      (normSlug && normCatalogId === normSlug) ||
      (normSlug && normAliases.includes(normSlug)) ||
      (normName && normCatalogName === normName) ||
      (normName && normAliases.includes(normName)) ||
      (normName && normCatalogId === normName)
    );
  });

  if (match) {
    return {
      ...match,
      isCustom: false,
    };
  }

  const key = normName || normSlug;
  const hex = Buffer.from(key, "utf8").toString("hex");
  const customId = "custom-" + hex;

  const idBytes = Buffer.byteLength(customId, "utf8");
  if (idBytes > 1500) {
    throw new Error(
      "Custom game ID exceeds Firestore 1500 byte limit (" + idBytes + " bytes): " + customId
    );
  }

  return {
    id: customId,
    name: (name || slug || "").trim(),
    aliases: [],
    franchise_id: null,
    color: "#c9a84c",
    isCustom: true,
  };
}
