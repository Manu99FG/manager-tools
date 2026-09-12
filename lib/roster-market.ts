import { getDropboxClient, getDropboxRosterPath } from "@/lib/dropbox";
import {
  getPlayerProfile,
  type EsmsPosition,
} from "@/lib/esms-player";
import { parseEsmsPlantilla } from "@/lib/parser-esms";

type PlayerIdentity = {
  name: string;
  nationality: string;
};

type RosterFile = {
  teamCode: string;
  path: string;
  text: string;
};

const POSITION_ORDER: EsmsPosition[] = [
  "GK",
  "DF",
  "DM",
  "MF",
  "AM",
  "FW",
];

export type RosterMutationBackup = {
  files: Array<{
    teamCode: string;
    path: string;
    originalText: string;
  }>;
};

function identityKey(identity: PlayerIdentity) {
  return `${identity.name.trim().toLowerCase()}::${identity.nationality
    .trim()
    .toLowerCase()}`;
}

function playerKey(
  player: ReturnType<typeof parseEsmsPlantilla>[number]
) {
  return identityKey({
    name: player.name,
    nationality: player.nat,
  });
}

function positionRank(position: EsmsPosition) {
  return POSITION_ORDER.indexOf(position);
}

function parseSinglePlayerLine(rawLine: string) {
  return parseEsmsPlantilla(rawLine)[0] ?? null;
}

async function downloadRoster(
  teamCode: string
): Promise<RosterFile> {
  const dbx = await getDropboxClient();
  const path = await getDropboxRosterPath(teamCode, "live");

  const response = await dbx.filesDownload({
    path,
  });

  const fileBlob = response.result.fileBlob;

  if (!fileBlob) {
    throw new Error(
      `No se pudo descargar la plantilla ${teamCode}.`
    );
  }

  return {
    teamCode: teamCode.toUpperCase(),
    path,
    text: await fileBlob.text(),
  };
}

function findPlayerRawLine(
  text: string,
  identity: PlayerIdentity
) {
  const target = identityKey(identity);

  const matches = parseEsmsPlantilla(text).filter(
    (player) => playerKey(player) === target
  );

  if (matches.length === 0) {
    throw new Error(
      `${identity.name} (${identity.nationality}) no aparece en la plantilla de origen.`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Hay más de una coincidencia para ${identity.name} (${identity.nationality}).`
    );
  }

  return matches[0].rawLine;
}

function hasPlayer(
  text: string,
  identity: PlayerIdentity
) {
  const target = identityKey(identity);

  return parseEsmsPlantilla(text).some(
    (player) => playerKey(player) === target
  );
}

function removeRawLine(
  text: string,
  rawLine: string
) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const hadTrailingNewline = text.endsWith("\n");
  const lines = text.split(/\r?\n/);

  const indexes = lines
    .map((line, index) =>
      line === rawLine ? index : -1
    )
    .filter((index) => index >= 0);

  if (indexes.length !== 1) {
    throw new Error(
      "No se pudo localizar de forma única la línea ESMS del jugador."
    );
  }

  lines.splice(indexes[0], 1);

  let result = lines.join(eol);

  if (hadTrailingNewline && !result.endsWith(eol)) {
    result += eol;
  }

  return result;
}

function insertPlayerLine(
  text: string,
  rawLine: string
) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const hadTrailingNewline = text.endsWith("\n");
  const lines = text.split(/\r?\n/);
  const players = parseEsmsPlantilla(text);

  if (players.length === 0) {
    throw new Error(
      "La plantilla de destino no contiene jugadores ESMS válidos."
    );
  }

  const playerLineIndexes = players
    .map((player) =>
      lines.findIndex(
        (line) => line === player.rawLine
      )
    )
    .filter((index) => index >= 0);

  if (playerLineIndexes.length === 0) {
    throw new Error(
      "No se pudo localizar el punto de inserción en la plantilla."
    );
  }

  const newPlayer = parseSinglePlayerLine(rawLine);

  if (!newPlayer) {
    throw new Error(
      "No se pudo clasificar la posición del jugador entrante."
    );
  }

  const newRank = positionRank(
    getPlayerProfile(newPlayer)
  );

  const indexedPlayers = players
    .map((player) => ({
      player,
      index: lines.findIndex(
        (line) => line === player.rawLine
      ),
    }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  const previousSameOrEarlier = indexedPlayers
    .filter(
      (item) =>
        positionRank(getPlayerProfile(item.player)) <=
        newRank
    )
    .at(-1);

  const nextLater = indexedPlayers.find(
    (item) =>
      positionRank(getPlayerProfile(item.player)) > newRank
  );

  const insertAt = previousSameOrEarlier
    ? previousSameOrEarlier.index + 1
    : nextLater
      ? nextLater.index
      : Math.max(...playerLineIndexes) + 1;

  lines.splice(insertAt, 0, rawLine);

  let result = lines.join(eol);

  if (hadTrailingNewline && !result.endsWith(eol)) {
    result += eol;
  }

  return result;
}

async function uploadRoster(
  path: string,
  text: string
) {
  const dbx = await getDropboxClient();

  await dbx.filesUpload({
    path,
    contents: Buffer.from(text, "utf8"),
    mode: {
      ".tag": "overwrite",
    },
    autorename: false,
    mute: true,
  });
}

export async function movePlayerBetweenRosters({
  player,
  fromTeamCode,
  toTeamCode,
}: {
  player: PlayerIdentity;
  fromTeamCode: string;
  toTeamCode: string;
}): Promise<RosterMutationBackup> {
  const from = fromTeamCode.toUpperCase();
  const to = toTeamCode.toUpperCase();

  if (from === to) {
    throw new Error(
      "El club de origen y destino no pueden ser el mismo."
    );
  }

  const [source, destination] =
    await Promise.all([
      downloadRoster(from),
      downloadRoster(to),
    ]);

  if (hasPlayer(destination.text, player)) {
    throw new Error(
      `${player.name} ya aparece en la plantilla ${to}.`
    );
  }

  const rawLine = findPlayerRawLine(
    source.text,
    player
  );

  const nextSourceText = removeRawLine(
    source.text,
    rawLine
  );

  const nextDestinationText = insertPlayerLine(
    destination.text,
    rawLine
  );

  const backup: RosterMutationBackup = {
    files: [
      {
        teamCode: source.teamCode,
        path: source.path,
        originalText: source.text,
      },
      {
        teamCode: destination.teamCode,
        path: destination.path,
        originalText: destination.text,
      },
    ],
  };

  try {
    await uploadRoster(
      source.path,
      nextSourceText
    );

    await uploadRoster(
      destination.path,
      nextDestinationText
    );

    return backup;
  } catch (error) {
    await rollbackRosterMutation(backup).catch(
      (rollbackError) => {
        console.error(
          "No se pudo restaurar completamente la plantilla:",
          rollbackError
        );
      }
    );

    throw error;
  }
}

export async function swapPlayersBetweenRosters({
  firstPlayer,
  firstTeamCode,
  secondPlayer,
  secondTeamCode,
}: {
  firstPlayer: PlayerIdentity;
  firstTeamCode: string;
  secondPlayer: PlayerIdentity;
  secondTeamCode: string;
}): Promise<RosterMutationBackup> {
  return tradePlayersBetweenRosters({
    firstPlayers: [firstPlayer],
    firstTeamCode,
    secondPlayers: [secondPlayer],
    secondTeamCode,
  });
}

export async function tradePlayersBetweenRosters({
  firstPlayers,
  firstTeamCode,
  secondPlayers,
  secondTeamCode,
}: {
  firstPlayers: PlayerIdentity[];
  firstTeamCode: string;
  secondPlayers: PlayerIdentity[];
  secondTeamCode: string;
}): Promise<RosterMutationBackup> {
  const firstTeam = firstTeamCode.toUpperCase();
  const secondTeam = secondTeamCode.toUpperCase();

  if (firstTeam === secondTeam) {
    throw new Error(
      "Un intercambio necesita dos equipos diferentes."
    );
  }

  if (
    firstPlayers.length === 0 ||
    secondPlayers.length === 0
  ) {
    throw new Error(
      "Un intercambio necesita al menos un jugador por cada club."
    );
  }

  const [firstRoster, secondRoster] =
    await Promise.all([
      downloadRoster(firstTeam),
      downloadRoster(secondTeam),
    ]);

  const firstRawLines = firstPlayers.map((player) =>
    findPlayerRawLine(firstRoster.text, player)
  );

  const secondRawLines = secondPlayers.map((player) =>
    findPlayerRawLine(secondRoster.text, player)
  );

  for (const player of firstPlayers) {
    if (hasPlayer(secondRoster.text, player)) {
      throw new Error(
        `${player.name} ya aparece en ${secondTeam}.`
      );
    }
  }

  for (const player of secondPlayers) {
    if (hasPlayer(firstRoster.text, player)) {
      throw new Error(
        `${player.name} ya aparece en ${firstTeam}.`
      );
    }
  }

  let nextFirstText = firstRoster.text;
  let nextSecondText = secondRoster.text;

  for (const rawLine of firstRawLines) {
    nextFirstText = removeRawLine(
      nextFirstText,
      rawLine
    );
  }

  for (const rawLine of secondRawLines) {
    nextSecondText = removeRawLine(
      nextSecondText,
      rawLine
    );
  }

  for (const rawLine of secondRawLines) {
    nextFirstText = insertPlayerLine(
      nextFirstText,
      rawLine
    );
  }

  for (const rawLine of firstRawLines) {
    nextSecondText = insertPlayerLine(
      nextSecondText,
      rawLine
    );
  }

  const backup: RosterMutationBackup = {
    files: [
      {
        teamCode: firstRoster.teamCode,
        path: firstRoster.path,
        originalText: firstRoster.text,
      },
      {
        teamCode: secondRoster.teamCode,
        path: secondRoster.path,
        originalText: secondRoster.text,
      },
    ],
  };

  try {
    await uploadRoster(
      firstRoster.path,
      nextFirstText
    );

    await uploadRoster(
      secondRoster.path,
      nextSecondText
    );

    return backup;
  } catch (error) {
    await rollbackRosterMutation(backup).catch(
      (rollbackError) => {
        console.error(
          "No se pudo restaurar completamente el intercambio:",
          rollbackError
        );
      }
    );

    throw error;
  }
}

export async function rollbackRosterMutation(
  backup: RosterMutationBackup
) {
  for (const file of backup.files) {
    await uploadRoster(
      file.path,
      file.originalText
    );
  }
}
