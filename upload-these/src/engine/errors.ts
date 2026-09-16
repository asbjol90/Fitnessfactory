/** A rule violation the UI should show as a message, not a crash. */
export class GameError extends Error {
  override name = 'GameError';
}
