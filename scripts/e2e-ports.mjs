const firstDefaultE2ePort = 4173;
const lastDefaultE2ePort = 4187;
const firstDefaultUiSmokePort = 4193;
const lastDefaultUiSmokePort = 4195;
const lastConfiguredTestPort = lastDefaultUiSmokePort;

export function getE2ePortOffset(environment = process.env) {
  const rawOffset = environment.OPEN_GRID_E2E_PORT_OFFSET ?? "0";
  const offset = Number(rawOffset);

  if (rawOffset.trim().length === 0 || !Number.isInteger(offset) || offset < 0 || lastConfiguredTestPort + offset > 65_535) {
    throw new TypeError("OPEN_GRID_E2E_PORT_OFFSET must be a non-negative integer that keeps every E2E port at or below 65535");
  }

  return offset;
}

export function getE2ePort(defaultPort, environment = process.env) {
  const isFullE2ePort = defaultPort >= firstDefaultE2ePort && defaultPort <= lastDefaultE2ePort;
  const isUiSmokePort = defaultPort >= firstDefaultUiSmokePort && defaultPort <= lastDefaultUiSmokePort;
  if (!Number.isInteger(defaultPort) || (!isFullE2ePort && !isUiSmokePort)) {
    throw new TypeError(
      `Test default port must be between ${firstDefaultE2ePort} and ${lastDefaultE2ePort} or between ${firstDefaultUiSmokePort} and ${lastDefaultUiSmokePort}`,
    );
  }

  return defaultPort + getE2ePortOffset(environment);
}

export function getE2eUrl(defaultPort, path = "/", environment = process.env) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `http://127.0.0.1:${getE2ePort(defaultPort, environment)}${normalizedPath}`;
}

export function withE2ePortOffset(value, environment = process.env) {
  return value.replace(/\b(41(?:7[3-9]|8[0-7]|9[3-5]))\b/gu, (port) => String(getE2ePort(Number(port), environment)));
}
