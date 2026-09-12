export const VALID_TACTICS = new Set(["N", "D", "A", "P", "C", "L", "T", "E"]);
export const VALID_POSITIONS = new Set(["GK", "DF", "DM", "MF", "AM", "FW"]);
const ACTION_ARGUMENTS = new Map<string, number>([["SUB", 3], ["TACTIC", 1], ["CHANGEPOS", 2], ["CHANGEAGG", 1]]);
const NUMERIC_CONDITIONS = new Set(["MIN", "SCORE", "SHOTS"]);
const POSITION_CONDITIONS = new Set(["RED", "YELLOW", "INJURED"]);
const OPERATORS = new Set(["=", "<=", ">="]);

export type OriginalLeague = { [key: string]: number };
export type OriginalRosterPlayer = { name: string; st: number; tk: number; ps: number; sh: number; injury?: number; suspension?: number };
export type OriginalPredicate =
  | { kind: string; operator: string; value: number; rawValue: string }
  | { kind: string; position: string }
  | { kind: string };
export type OriginalOrder = { action: string; arguments: string[]; predicates: OriginalPredicate[]; line: number };
export type OriginalSelection = { position: string; playerName: string; physicalLine: number };
export type OriginalTeamsheet = { team: string; tactic: string; starters: OriginalSelection[]; substitutes: OriginalSelection[]; penaltyTaker: string; orders: OriginalOrder[] };
export type OriginalCheckerError = { code: string; message: string; line: number | null; explanation: string };
export type OriginalCheckerResult =
  | { valid: true; error: null; teamsheet: OriginalTeamsheet }
  | { valid: false; error: OriginalCheckerError; teamsheet: null };

type Token = { text: string; physicalLine: number; start: number; end: number };

function basePosition(value: unknown) { return String(value ?? ""); }
function originalAtoi(value: unknown) { const match = String(value ?? "").match(/^\s*([+-]?\d+)/); return match ? Number.parseInt(match[1], 10) : 0; }
function failure(code: string, message: string, line: number | null = null, explanation = ""): OriginalCheckerResult { return { valid: false, error: { code, message, line, explanation }, teamsheet: null }; }

export function parseOriginalLeague(text: string): OriginalLeague {
  const result: OriginalLeague = {};
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const match = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^|;#]+)/);
    if (match) result[match[1]] = originalAtoi(match[2]);
  }
  return result;
}

export function parseOriginalRoster(text: string): OriginalRosterPlayer[] {
  const players: OriginalRosterPlayer[] = [];
  const allLines = String(text ?? "").split(/\r?\n/);
  const header = (allLines[0] ?? "").trim().split(/\s+/);
  const column = (name: string) => header.indexOf(name);
  const read = (fields: string[], name: string, fallback: string) => {
    const index = column(name);
    return index >= 0 && index < fields.length ? fields[index] : fallback;
  };
  for (const raw of allLines.slice(2)) {
    const fields = raw.trim().split(/\s+/);
    if (fields.length < 19) continue;
    players.push({ name: read(fields, "Name", ""), st: originalAtoi(read(fields, "St", "-1000")), tk: originalAtoi(read(fields, "Tk", "-1000")), ps: originalAtoi(read(fields, "Ps", "-1000")), sh: originalAtoi(read(fields, "Sh", "-1000")), injury: originalAtoi(read(fields, "Inj", "-1")), suspension: originalAtoi(read(fields, "Sus", "-1")) });
    if (players.length >= 51) break;
  }
  return players;
}

function parseOrder(tokens: string[], team: string, orderLine: number, validPositions: Set<string>, validConditionPositions: Set<string>, validTactics: Set<string>): { error: string; order?: never } | { error?: never; order: OriginalOrder } {
  const action = tokens[0]?.toUpperCase() ?? "";
  if (action === "AGG") {
    if (tokens.length < 2) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Order does not contain enough information` };
    const aggression = tokens[1];
    if (originalAtoi(aggression) < 1 || originalAtoi(aggression) > 20) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal aggression specified` };
    return { order: { action, arguments: [aggression], predicates: [], line: orderLine } };
  }
  if (!ACTION_ARGUMENTS.has(action)) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: ${tokens[0] ?? ""} - Unknown order` };
  const required = ACTION_ARGUMENTS.get(action) ?? 0;
  const supplied = Math.max(0, tokens.length - 1);
  if (action === "SUB" && supplied < 3) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: ${supplied < 2 ? "Order does not contain enough information" : "SUB order does not contain enough information"}` };
  if (action === "TACTIC" && supplied < 1) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Tactic order does not contain enough information` };
  if (action === "CHANGEPOS" && supplied < 2) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: ${supplied === 0 ? "CHANGEPOS order does not contain enough information" : "Order does not contain enough information"}` };
  if (action === "CHANGEAGG" && supplied < 1) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: CHANGEAGG Order does not contain enough information` };
  const args = tokens.slice(1, required + 1);
  while (args.length < required) args.push("");
  if (action === "TACTIC" && !validTactics.has(args[0])) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal tactic` };
  if (action === "CHANGEAGG" && (originalAtoi(args[0]) < 1 || originalAtoi(args[0]) > 20)) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal aggression specified` };
  if (action === "SUB") {
    if ((originalAtoi(args[0]) < 1 || originalAtoi(args[0]) > 16) && !validPositions.has(args[0])) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal number/position of player coming out` };
    if (originalAtoi(args[1]) < 1 || originalAtoi(args[1]) > 16) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal number of player coming in` };
    if (!validPositions.has(args[2])) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal player position` };
  }
  if (action === "CHANGEPOS") {
    if (originalAtoi(args[0]) < 1 || originalAtoi(args[0]) > 16) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal number of player` };
    if (!validPositions.has(args[1])) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal player position` };
  }
  const ifIndex = required + 1;
  if (tokens[ifIndex] !== "IF") return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: IF missing` };
  const conditionTokens = tokens.slice(ifIndex + 1);
  if (!conditionTokens.length) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Condition type missing after IF` };
  const predicates: OriginalPredicate[] = [];
  let cursor = 0;
  while (cursor < conditionTokens.length) {
    const kind = conditionTokens[cursor++].toUpperCase();
    if (NUMERIC_CONDITIONS.has(kind)) {
      const operator = conditionTokens[cursor++];
      if (!OPERATORS.has(operator)) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason:  Sign missing after ${kind === "SHOTS" ? "MIN" : kind}` };
      if (cursor >= conditionTokens.length) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: ${kind === "MIN" ? "Minute" : kind[0] + kind.slice(1).toLowerCase()} missing after '=' sign` };
      const rawValue = conditionTokens[cursor++];
      predicates.push({ kind, operator, value: originalAtoi(rawValue), rawValue });
    } else if (POSITION_CONDITIONS.has(kind)) {
      if (cursor >= conditionTokens.length) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Position missing after ${kind} command` };
      const position = conditionTokens[cursor++].toUpperCase();
      if (!validConditionPositions.has(position)) return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Illegal Position after ${kind} command` };
      predicates.push({ kind, position });
    } else {
      return { error: `Error in conditionals of ${team} (line ${orderLine})!!\nReason: Condition type missing after IF` };
    }
  }
  return { order: { action, arguments: args.slice(0, required), predicates, line: orderLine } };
}

export function validateOriginalTeamsheet({ teamsheetText, roster, rosterTeam = null, league = {} }: { teamsheetText: string; roster: OriginalRosterPlayer[] | string; rosterTeam?: string | null; league?: OriginalLeague }): OriginalCheckerResult {
  const sourceLines = String(teamsheetText ?? "").split(/\r?\n/);
  const tokens: Token[] = [];
  sourceLines.forEach((line, index) => {
    for (const match of line.matchAll(/\S+/g)) tokens.push({ text: match[0], physicalLine: index + 1, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  });
  if (tokens.length < 2) return failure("OPEN_TEAMSHEET", "Error. Failed to open teamsheet");
  const team = tokens[0].text.toLowerCase();
  const tactic = tokens[1].text.toUpperCase();
  const extendedPositions = originalAtoi(league.Positions ?? "0") !== 0;
  const validPositions = extendedPositions ? VALID_POSITIONS : new Set(["GK", "DF", "MF", "FW"]);
  const validConditionPositions = new Set([...validPositions, "OGK", "ODF", "OMF", "OFW", "OPL", ...(extendedPositions ? ["ODM", "OAM"] : [])]);
  const validTactics = new Set(["N", "D", "A", "P", "C", "L", "T"]);
  if (originalAtoi(league.Tactic_7 ?? "0") !== 0) validTactics.add("E");
  if (rosterTeam !== null && team.toLowerCase() !== String(rosterTeam).toLowerCase()) return failure("OPEN_ROSTER", "Error. Failed to open roster", tokens[0].physicalLine);
  const pkTokenIndex = 34;
  const selections: OriginalSelection[] = [];
  for (let number = 0; number < 16; number++) {
    const position = tokens[2 + number * 2];
    const player = tokens[3 + number * 2];
    if (!position || !player) return failure("UNREADABLE_PK", `Error !! Unreadable penalty kick taker in ${team}`);
    selections.push({ position: position.text.toUpperCase(), playerName: player.text, physicalLine: position.physicalLine });
  }
  if (basePosition(selections[0].position) !== "GK") return failure("FIRST_NOT_GK", ` ERROR !! The first player in <${team}> must be a GK`, selections[0].physicalLine);
  const rosterPlayers = Array.isArray(roster) ? roster : parseOriginalRoster(roster);
  const playerMap = new Map(rosterPlayers.map((player) => [String(player.name), player]));
  const maxSkill = originalAtoi(league.Max_Skill ?? "100");
  for (const selection of selections) {
    const matches = rosterPlayers.filter((player) => String(player.name) === selection.playerName);
    if (!matches.length) return failure("PLAYER_MISSING", ` ERROR !! Player ${selection.playerName} (${team}) doesn't exist in the roster file`, selection.physicalLine);
    for (const player of matches) {
      if (Number(player.injury ?? 0) > 0) return failure("PLAYER_INJURED", `Error !! Player ${player.name} (${team}) is injured for the game`, selection.physicalLine);
      if (Number(player.suspension ?? 0) > 0) return failure("PLAYER_SUSPENDED", `Error !! Player ${player.name} (${team}) is suspended for the game`, selection.physicalLine);
    }
  }
  if (tokens.length <= pkTokenIndex || tokens[pkTokenIndex].text !== "PK:") return failure("UNREADABLE_PK", `Error !! Unreadable penalty kick taker in ${team}`);
  const penaltyToken = tokens[35];
  const penaltyTaker = penaltyToken?.text ?? "";
  if (!penaltyTaker) return failure("INVALID_PK", `Error in penalty kick taker of ${team} !!`, tokens[pkTokenIndex].physicalLine);
  if (!selections.some((selection) => selection.playerName === penaltyTaker)) return failure("INVALID_PK", `Error in penalty kick taker of ${team} !!`, penaltyToken?.physicalLine ?? tokens[pkTokenIndex].physicalLine);
  const selectedNames = new Set<string>();
  for (const selection of selections) {
    if (selectedNames.has(selection.playerName)) return failure("PLAYER_DUPLICATED", `Error !! Player ${selection.playerName} (${team}) is named twice in the team sheet`, selection.physicalLine);
    selectedNames.add(selection.playerName);
  }
  const starters = selections.slice(0, 11);
  const orders: OriginalOrder[] = [];
  let orderLine = 0;
  const orderRows: { text: string; physicalLine: number }[] = [];
  const penaltyLine = sourceLines[penaltyToken.physicalLine - 1] ?? "";
  const remainderOnPenaltyLine = penaltyLine.slice(penaltyToken.end).trim();
  if (remainderOnPenaltyLine) orderRows.push({ text: remainderOnPenaltyLine, physicalLine: penaltyToken.physicalLine });
  for (const [index, rawLine] of sourceLines.entries()) {
    if (index + 1 <= penaltyToken.physicalLine || !rawLine.trim()) continue;
    orderRows.push({ text: rawLine.trim(), physicalLine: index + 1 });
  }
  for (const row of orderRows) {
    orderLine++;
    const parsed = parseOrder(row.text.split(/\s+/), team, orderLine, validPositions, validConditionPositions, validTactics);
    if (parsed.error) return failure("CONDITIONAL", parsed.error, row.physicalLine);
    if (parsed.order) orders.push(parsed.order);
  }
  for (const selection of selections) {
    const player = playerMap.get(selection.playerName);
    if (player && Math.max(player.st, player.tk, player.ps, player.sh) > maxSkill) return failure("SKILL_LIMIT", `ERROR !!\nPlayer ${player.name} of ${team} is over the skill limit set!!`, selection.physicalLine);
  }
  if (!validTactics.has(tactic)) return failure("WRONG_TACTIC", `Input error ! Wrong tactic name for ${team}`, tokens[1].physicalLine, "Táctica inicial no admitida por el original.");
  for (let selectionIndex = 1; selectionIndex < 11; selectionIndex++) {
    const selection = selections[selectionIndex];
    if (selection.position === "GK" || !validPositions.has(selection.position)) return failure("WRONG_POSITION", `Error in <${team}> team sheet !! Wrong position specified for <${selection.playerName}>.`, selection.physicalLine);
  }
  const counts = Object.fromEntries([...VALID_POSITIONS].map((position) => [position, 0])) as Record<string, number>;
  for (const selection of starters) counts[basePosition(selection.position)]++;
  const formationGroups = { DF: counts.DF, MF: counts.DM + counts.MF + counts.AM, FW: counts.FW };
  for (const position of ["DF", "MF", "FW"] as const) {
    const minimum = originalAtoi(league[`Min_${position}`] ?? "0");
    const maximum = originalAtoi(league[`Max_${position}`] ?? "10");
    if (formationGroups[position] < minimum || formationGroups[position] > maximum) return failure("ILLEGAL_FORMATION", `Error in formation of ${team}!!\nReason:  Illegal formation specified`);
  }
  if (counts.DM > originalAtoi(league.Max_DM ?? "10") || counts.AM > originalAtoi(league.Max_AM ?? "10")) return failure("ILLEGAL_FORMATION", `Error in formation of ${team}!!\nReason:  Illegal formation specified`);
  return { valid: true, error: null, teamsheet: { team: team.toUpperCase(), tactic, starters, substitutes: selections.slice(11), penaltyTaker, orders } };
}

