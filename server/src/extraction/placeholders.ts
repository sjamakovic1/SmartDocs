export function isPlaceholderValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim().match(/^\[[^\]]+\]$/));
}

export function stripPlaceholderBrackets(value: string): string {
  return value.trim().replace(/^\[([^\]]+)\]$/, '$1').trim();
}
