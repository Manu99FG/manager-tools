import { getClubName } from "@/lib/club-names";

type WikipediaPage = {
  pageid: number;
  title: string;
  index?: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
};

type WikipediaResponse = {
  query?: {
    pages?: WikipediaPage[];
  };
};

export async function getClubLogo(
  code: string
): Promise<string | null> {
  const clubName = getClubName(code);

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",

    generator: "prefixsearch",
    gpssearch: clubName,
    gpsnamespace: "0",
    gpslimit: "5",

    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "300",
    pilimit: "5",

    redirects: "1",
  });

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?${params.toString()}`,
      {
        /*
         * Evitamos hacer la búsqueda continuamente.
         * Vercel/Next podrá reutilizarla durante 7 días.
         */
        next: {
          revalidate: 60 * 60 * 24 * 7,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as WikipediaResponse;

    const pages = data.query?.pages ?? [];

    const ordered = [...pages].sort(
      (a, b) =>
        (a.index ?? 999) - (b.index ?? 999)
    );

    const pageWithImage = ordered.find(
      (page) => page.thumbnail?.source
    );

    return pageWithImage?.thumbnail?.source ?? null;
  } catch (error) {
    console.error(
      `No se pudo obtener el logo de ${clubName}`,
      error
    );

    return null;
  }
}