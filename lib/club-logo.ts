import { getClubName } from "@/lib/club-names";

type SearchEntity = {
  id: string;
  label?: string;
  description?: string;
};

type SearchResponse = {
  search?: SearchEntity[];
};

type Claim = {
  mainsnak?: {
    datavalue?: {
      value?: string;
    };
  };
};

type Entity = {
  claims?: {
    P154?: Claim[];
  };
};

type EntityResponse = {
  entities?: Record<string, Entity>;
};

async function searchClubEntity(
  clubName: string
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    uselang: "en",
    type: "item",
    limit: "10",
    search: clubName,
  });

  const response = await fetch(
    `https://www.wikidata.org/w/api.php?${params.toString()}`,
    {
      headers: {
        "User-Agent":
          "ManagerTools/1.0 (football manager web app)",
      },
      next: {
        revalidate: 60 * 60 * 24 * 30,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SearchResponse;

  const results = data.search ?? [];

  /*
   * Preferimos resultados cuya descripción
   * indique que se trata de un club/equipo de fútbol.
   */
  const footballClub = results.find((result) => {
    const description =
      result.description?.toLowerCase() ?? "";

    return (
      description.includes("football club") ||
      description.includes("association football") ||
      description.includes("football team") ||
      description.includes("soccer club")
    );
  });

  return footballClub?.id ?? results[0]?.id ?? null;
}

async function getLogoFilename(
  entityId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    ids: entityId,
    props: "claims",
  });

  const response = await fetch(
    `https://www.wikidata.org/w/api.php?${params.toString()}`,
    {
      headers: {
        "User-Agent":
          "ManagerTools/1.0 (football manager web app)",
      },
      next: {
        revalidate: 60 * 60 * 24 * 30,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as EntityResponse;

  const claims =
    data.entities?.[entityId]?.claims?.P154;

  if (!claims?.length) {
    return null;
  }

  const filename =
    claims[0]?.mainsnak?.datavalue?.value;

  return typeof filename === "string"
    ? filename
    : null;
}

async function getCommonsImageUrl(
  filename: string
): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    titles: `File:${filename}`,
  });

  const response = await fetch(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    {
      headers: {
        "User-Agent":
          "ManagerTools/1.0 (football manager web app)",
      },
      next: {
        revalidate: 60 * 60 * 24 * 30,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  const pages = data?.query?.pages;

  if (!pages) {
    return null;
  }

  const page = Object.values(pages)[0] as {
    imageinfo?: {
      url?: string;
    }[];
  };

  return page.imageinfo?.[0]?.url ?? null;
}

export async function getClubLogo(
  code: string
): Promise<string | null> {
  const clubName = getClubName(code);

  try {
    const entityId =
      await searchClubEntity(clubName);

    if (!entityId) {
      return null;
    }

    const filename =
      await getLogoFilename(entityId);

    if (!filename) {
      return null;
    }

    return await getCommonsImageUrl(filename);
  } catch (error) {
    console.error(
      `No se pudo obtener el escudo de ${clubName}:`,
      error
    );

    return null;
  }
}