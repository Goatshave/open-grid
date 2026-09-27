const prereleasePattern = /-(alpha|beta|rc)\.([1-9]\d*)(?:\+[^+]+)?$/;

export function getReleaseChannel(version) {
  const versionWithoutBuild = version.split("+", 1)[0];

  if (!versionWithoutBuild.includes("-")) {
    return "stable";
  }

  const match = prereleasePattern.exec(version);
  if (!match) {
    throw new Error(
      `prerelease versions must use alpha.N, beta.N, or rc.N; got ${JSON.stringify(version)}`,
    );
  }

  return match[1];
}

export function requirePrereleaseNpmTagPolicy(version, npmTag) {
  const channel = getReleaseChannel(version);

  if (channel !== "stable" && npmTag !== "next") {
    throw new Error(
      `prerelease version ${JSON.stringify(version)} must use npm dist-tag "next"; got ${JSON.stringify(npmTag)}`,
    );
  }

  return channel;
}
