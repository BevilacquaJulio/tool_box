export function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortObjectKeys(record[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function formatJson(value: unknown, indent = 2): string {
  return `${JSON.stringify(value, null, indent)}\n`;
}

export function minifyJson(value: unknown): string {
  return JSON.stringify(value);
}
