export function isPlaceholderValue(value: string | null | undefined) {
  return Boolean(value?.trim().match(/^\[[^\]]+\]$/));
}

export function stripPlaceholderBrackets(value: string) {
  return value.trim().replace(/^\[([^\]]+)\]$/, '$1').trim();
}
