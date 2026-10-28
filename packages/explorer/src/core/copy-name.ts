export function availableCopyName(name: string, names: Set<string>): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let number = 1;
  let candidate: string;
  do {
    candidate = base + " copy" + (number === 1 ? "" : " " + number) + extension;
    number++;
  } while (names.has(candidate));
  return candidate;
}
