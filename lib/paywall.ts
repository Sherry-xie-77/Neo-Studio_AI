export const FREE_EPISODES = 3;

export function isEpisodeLocked(episodeIndex: number, hasPremium: boolean) {
  if (hasPremium) return false;
  return episodeIndex >= FREE_EPISODES;
}
