export const BENCHMARK_STRUCTURE_BUDGET_SCHEMA_VERSION = 1;

const METRICS = new Set([
  "mountedRowCount",
  "mountedCellCount",
  "domElementCount",
  "domNodeCount",
]);

export function evaluateStructureBudgets(config, observations) {
  validateStructureBudgetConfig(config);
  if (!Array.isArray(observations)) {
    throw new TypeError("structure budget observations must be an array");
  }

  const profileById = new Map(config.profiles.map((profile) => [profile.id, profile]));
  const applicationById = new Map(config.applications.map((application) => [application.id, application]));
  const observationByKey = new Map();

  for (const observation of observations) {
    validateObservation(observation, profileById, applicationById);
    const key = observationKey(observation.applicationId, observation.profileId);
    if (observationByKey.has(key)) {
      throw new TypeError(`duplicate structure budget observation: ${key}`);
    }
    observationByKey.set(key, observation);
  }

  for (const profile of config.profiles) {
    const profileObservations = [];
    for (const application of config.applications) {
      const key = observationKey(application.id, profile.id);
      const observation = observationByKey.get(key);
      if (!observation) throw new TypeError(`missing structure budget observation: ${key}`);
      profileObservations.push(observation);
    }
    assertComparableProfile(profile, profileObservations);
  }

  if (observationByKey.size !== config.profiles.length * config.applications.length) {
    throw new TypeError("structure budget observations contain unconfigured entries");
  }

  const checks = [];
  for (const application of config.applications) {
    for (const profile of config.profiles) {
      const observation = observationByKey.get(observationKey(application.id, profile.id));
      for (const [metric, maximum] of Object.entries(application.limits[profile.id])) {
        checks.push({
          id: `${profile.id}:${application.id}:${metric}`,
          type: "absolute",
          profileId: profile.id,
          applicationId: application.id,
          metric,
          actual: observation[metric],
          maximum,
          passed: observation[metric] <= maximum,
        });
      }
    }
  }

  for (const equality of config.equalities ?? []) {
    const values = equality.applicationIds.map((applicationId) =>
      observationByKey.get(observationKey(applicationId, equality.profileId))[equality.metric],
    );
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    checks.push({
      id: `${equality.profileId}:${equality.applicationIds.join("=")}:${equality.metric}`,
      type: "equality",
      profileId: equality.profileId,
      applicationIds: equality.applicationIds,
      metric: equality.metric,
      minimum,
      maximum,
      passed: minimum === maximum,
    });
  }

  for (const comparison of config.comparisons ?? []) {
    const candidate = observationByKey.get(observationKey(comparison.candidateId, comparison.profileId));
    const baseline = observationByKey.get(observationKey(comparison.baselineId, comparison.profileId));
    const maximum = baseline[comparison.metric] + comparison.maxDelta;
    checks.push({
      id: `${comparison.profileId}:${comparison.candidateId}:${comparison.metric}:${comparison.baselineId}`,
      type: "relative",
      profileId: comparison.profileId,
      applicationId: comparison.candidateId,
      baselineId: comparison.baselineId,
      metric: comparison.metric,
      actual: candidate[comparison.metric],
      baseline: baseline[comparison.metric],
      maxDelta: comparison.maxDelta,
      maximum,
      passed: candidate[comparison.metric] <= maximum,
    });
  }

  return {
    schemaVersion: BENCHMARK_STRUCTURE_BUDGET_SCHEMA_VERSION,
    passed: checks.every((check) => check.passed),
    observations,
    checks,
    failures: checks.filter((check) => !check.passed),
  };
}

export function validateStructureBudgetConfig(config) {
  if (config?.schemaVersion !== BENCHMARK_STRUCTURE_BUDGET_SCHEMA_VERSION) {
    throw new TypeError(`structure budget schemaVersion must be ${BENCHMARK_STRUCTURE_BUDGET_SCHEMA_VERSION}`);
  }
  if (!isPositiveInteger(config.viewport?.width) || !isPositiveInteger(config.viewport?.height)) {
    throw new TypeError("structure budget viewport width and height must be positive integers");
  }
  if (!Array.isArray(config.profiles) || config.profiles.length === 0) {
    throw new TypeError("structure budget profiles must be a non-empty array");
  }

  const profileIds = new Set();
  for (const profile of config.profiles) {
    if (typeof profile?.id !== "string" || profile.id.length === 0 || profileIds.has(profile.id)) {
      throw new TypeError("structure budget profile ids must be unique non-empty strings");
    }
    if (!isPositiveInteger(profile.rowCount) || !isPositiveInteger(profile.columnCount)) {
      throw new TypeError(`structure budget dimensions for ${profile.id} must be positive integers`);
    }
    profileIds.add(profile.id);
  }

  if (!Array.isArray(config.applications) || config.applications.length === 0) {
    throw new TypeError("structure budget applications must be a non-empty array");
  }
  const applicationIds = new Set();
  const applicationUrls = new Set();
  for (const application of config.applications) {
    if (typeof application?.id !== "string" || application.id.length === 0 || applicationIds.has(application.id)) {
      throw new TypeError("structure budget application ids must be unique non-empty strings");
    }
    if (typeof application.url !== "string" || !/^http:\/\/127\.0\.0\.1:\d+$/.test(application.url)) {
      throw new TypeError(`structure budget URL for ${application.id} must be a loopback HTTP origin`);
    }
    if (applicationUrls.has(application.url)) {
      throw new TypeError("structure budget application URLs must be unique");
    }
    if (!application.limits || typeof application.limits !== "object") {
      throw new TypeError(`structure budget limits for ${application.id} are required`);
    }
    for (const profileId of profileIds) {
      const limits = application.limits[profileId];
      if (!limits || typeof limits !== "object") {
        throw new TypeError(`structure budget limits for ${application.id}/${profileId} are required`);
      }
      for (const metric of METRICS) {
        if (!isPositiveInteger(limits[metric])) {
          throw new TypeError(`structure budget ${application.id}/${profileId}/${metric} must be a positive integer`);
        }
      }
      for (const metric of Object.keys(limits)) validateMetric(metric);
    }
    for (const profileId of Object.keys(application.limits)) {
      if (!profileIds.has(profileId)) throw new TypeError(`unknown structure budget profile: ${profileId}`);
    }
    applicationIds.add(application.id);
    applicationUrls.add(application.url);
  }

  if (config.equalities !== undefined && !Array.isArray(config.equalities)) {
    throw new TypeError("structure budget equalities must be an array");
  }
  for (const equality of config.equalities ?? []) {
    if (!profileIds.has(equality?.profileId)) throw new TypeError("structure budget equality must reference a configured profile");
    if (!Array.isArray(equality.applicationIds) || equality.applicationIds.length < 2 || new Set(equality.applicationIds).size !== equality.applicationIds.length || equality.applicationIds.some((id) => !applicationIds.has(id))) {
      throw new TypeError("structure budget equality must reference at least two distinct configured applications");
    }
    validateMetric(equality.metric);
  }

  if (config.comparisons !== undefined && !Array.isArray(config.comparisons)) {
    throw new TypeError("structure budget comparisons must be an array");
  }
  for (const comparison of config.comparisons ?? []) {
    if (!profileIds.has(comparison?.profileId)) throw new TypeError("structure budget comparison must reference a configured profile");
    if (!applicationIds.has(comparison.candidateId) || !applicationIds.has(comparison.baselineId) || comparison.candidateId === comparison.baselineId) {
      throw new TypeError("structure budget comparisons must reference distinct configured applications");
    }
    validateMetric(comparison.metric);
    if (!Number.isSafeInteger(comparison.maxDelta) || comparison.maxDelta < 0) {
      throw new TypeError("structure budget comparison maxDelta must be a non-negative safe integer");
    }
  }
}

export function formatStructureBudgetMarkdown(result) {
  if (!result || !Array.isArray(result.observations) || !Array.isArray(result.checks)) {
    throw new TypeError("structure budget result must include observations and checks");
  }
  const lines = [
    "# Open Grid Structure Budget",
    "",
    `- Status: ${result.passed ? "passed" : "failed"}`,
    `- Schema: ${result.schemaVersion}`,
    "",
    "| Profile | Application | Mounted rows | Mounted cells | DOM elements | Document nodes |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...result.observations.map((observation) =>
      `| ${observation.profileId} | ${observation.applicationId} | ${observation.mountedRowCount} | ${observation.mountedCellCount} | ${observation.domElementCount} | ${observation.domNodeCount} |`,
    ),
    "",
    `- Checks: ${result.checks.length}`,
    `- Failures: ${result.failures.length}`,
  ];
  if (result.failures.length > 0) {
    lines.push("", "| Failed check | Actual | Maximum |", "| --- | ---: | ---: |", ...result.failures.map((failure) =>
      `| ${failure.id} | ${failure.actual ?? failure.maximum} | ${failure.maximum} |`,
    ));
  }
  return `${lines.join("\n")}\n`;
}

function validateObservation(observation, profileById, applicationById) {
  if (!applicationById.has(observation?.applicationId) || !profileById.has(observation?.profileId)) {
    throw new TypeError("structure budget observation must reference a configured application and profile");
  }
  if (typeof observation.datasetFingerprint !== "string" || observation.datasetFingerprint.length === 0) {
    throw new TypeError("structure budget observation datasetFingerprint must be a non-empty string");
  }
  for (const field of ["rowCount", "columnCount", "displayedRowCount", ...METRICS]) {
    if (!Number.isSafeInteger(observation[field]) || observation[field] < 0) {
      throw new TypeError(`structure budget observation ${field} must be a non-negative safe integer`);
    }
  }
}

function assertComparableProfile(profile, observations) {
  const fingerprints = new Set(observations.map((observation) => observation.datasetFingerprint));
  if (fingerprints.size !== 1) throw new TypeError(`structure budget dataset mismatch for ${profile.id}`);
  for (const observation of observations) {
    if (observation.rowCount !== profile.rowCount || observation.displayedRowCount !== profile.rowCount || observation.columnCount !== profile.columnCount) {
      throw new TypeError(`structure budget logical dimensions mismatch for ${profile.id}/${observation.applicationId}`);
    }
  }
}

function validateMetric(metric) {
  if (!METRICS.has(metric)) throw new TypeError(`unsupported structure budget metric: ${metric}`);
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function observationKey(applicationId, profileId) {
  return `${profileId}/${applicationId}`;
}
