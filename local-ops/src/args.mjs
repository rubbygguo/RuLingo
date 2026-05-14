export function parseArgs(values) {
  const positional = [];
  const options = {};

  for (const item of values) {
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }

    const [key, ...rest] = item.replace(/^--/, "").split("=");
    options[key] = rest.length ? rest.join("=") : true;
  }

  return { positional, options };
}
