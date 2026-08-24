// ESPN public scoreboard client.
//
// Endpoint (no API key required):
//   https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
//     ?dates=<season>&seasontype=2&week=<week>
//
// seasontype 2 = regular season (weeks 1-18), which is all this pool covers.

const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Our team ids are the lowercased standard abbreviations (see the teams table).
const TEAM_IDS = new Set([
  'buf', 'mia', 'ne', 'nyj', 'bal', 'cin', 'cle', 'pit',
  'hou', 'ind', 'jax', 'ten', 'den', 'kc', 'lv', 'lac',
  'dal', 'nyg', 'phi', 'was', 'chi', 'det', 'gb', 'min',
  'atl', 'car', 'no', 'tb', 'ari', 'lar', 'sf', 'sea',
]);

// ESPN abbreviations that don't simply lowercase into our ids.
// WSH is the live one; the rest are relocation/legacy spellings kept as a safety net.
const ABBR_OVERRIDES: Record<string, string> = {
  WSH: 'was',
  JAC: 'jax',
  LA: 'lar',
  STL: 'lar',
  OAK: 'lv',
  SD: 'lac',
};

export function espnAbbrToTeamId(abbr: string | undefined | null): string | null {
  if (!abbr) return null;
  const upper = abbr.toUpperCase();
  const override = ABBR_OVERRIDES[upper];
  if (override) return override;
  const lower = upper.toLowerCase();
  return TEAM_IDS.has(lower) ? lower : null;
}

// Statuses that mean "this game is over and the result stands".
// Anything else (in progress, postponed, canceled) is left alone.
const FINAL_STATUSES = new Set([
  'STATUS_FINAL',
  'STATUS_FINAL_OVERTIME',
  'STATUS_FINAL_PEN', // shootout, not used by the NFL but harmless
]);

export interface EspnGame {
  espnId: string;
  week: number;
  date: string;
  shortName: string;
  awayTeam: string | null;
  homeTeam: string | null;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number | null;
  homeScore: number | null;
  /** True only for games that actually finished (not postponed/canceled). */
  isFinal: boolean;
  /** Team id of the winner, or null for a tie or an unfinished game. */
  winner: string | null;
  isTie: boolean;
  statusName: string;
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  team?: { abbreviation?: string };
}

export async function fetchEspnWeek(season: number, week: number): Promise<EspnGame[]> {
  const url = `${ESPN_SCOREBOARD}?dates=${season}&seasontype=2&week=${week}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ESPN request failed for ${season} week ${week}: ${response.status}`);
  }

  const payload = await response.json();
  const events: any[] = payload?.events ?? [];

  return events.map((event) => {
    const competition = event?.competitions?.[0] ?? {};
    const competitors: EspnCompetitor[] = competition?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');

    const statusName: string = competition?.status?.type?.name ?? 'STATUS_UNKNOWN';
    const completed: boolean = competition?.status?.type?.completed === true;

    const homeScore = parseScore(home?.score);
    const awayScore = parseScore(away?.score);

    const isFinal =
      completed &&
      FINAL_STATUSES.has(statusName) &&
      homeScore !== null &&
      awayScore !== null;

    const homeTeam = espnAbbrToTeamId(home?.team?.abbreviation);
    const awayTeam = espnAbbrToTeamId(away?.team?.abbreviation);

    let winner: string | null = null;
    let isTie = false;

    if (isFinal) {
      if (homeScore! > awayScore!) {
        winner = homeTeam;
      } else if (awayScore! > homeScore!) {
        winner = awayTeam;
      } else {
        isTie = true;
      }
    }

    return {
      espnId: String(event?.id ?? ''),
      week: Number(payload?.week?.number ?? week),
      date: String(event?.date ?? ''),
      shortName: String(event?.shortName ?? event?.name ?? ''),
      awayTeam,
      homeTeam,
      awayAbbr: away?.team?.abbreviation ?? '?',
      homeAbbr: home?.team?.abbreviation ?? '?',
      awayScore,
      homeScore,
      isFinal,
      winner,
      isTie,
      statusName,
    };
  });
}

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Every regular-season game for a season, fetched a week at a time.
 *
 * ESPN serves the full schedule as soon as it is published, so this works for
 * an upcoming season too - the games just come back unplayed.
 */
export async function fetchEspnSeason(season: number, lastWeek: number): Promise<EspnGame[]> {
  const weeks: EspnGame[][] = [];
  for (let week = 1; week <= lastWeek; week++) {
    weeks.push(await fetchEspnWeek(season, week));
  }
  return weeks.flat();
}
