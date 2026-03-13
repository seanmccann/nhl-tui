const BASE_URL = "https://api-web.nhle.com/v1";

async function requestJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "user-agent": "nhl-tui/0.1.0",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `NHL API request failed: ${response.status} ${response.statusText} ${text}`.trim(),
    );
  }

  return response.json();
}

export class NhlApi {
  async fetchScoreboard(scoreboardDate: string): Promise<unknown> {
    return requestJson(`/score/${scoreboardDate}`);
  }

  async fetchSummary(gameId: number): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/landing`);
  }

  async fetchPlayByPlay(gameId: number): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/play-by-play`);
  }

  async fetchBoxScore(gameId: number): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/boxscore`);
  }
}
