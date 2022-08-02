const core = require("@actions/core");
const github = require("@actions/github");
const sodium = require("tweetsodium");

// Base on actions/javascript-action template.
async function run() {
  try {
    // Get tokens from arguments of an action
    const githubToken = core.getInput("github_token", { required: true });
    const owner = core.getInput("owner", { required: true });
    const repository = core.getInput("repository", { required: false });
    const isDependabotSecret = core.getInput("dependabot", { required: false });
    const secretName = core.getInput("secret_name", { required: true });
    const secretValue = core.getInput("secret_value", { required: true });
    const selectedRepoIds = core.getInput("selected_repository_ids", {
      required: false,
    });

    core.info(`> owner: ${owner}`);
    core.info(`> repository: ${repository}`);
    core.info(`> is Dependabot secret: ${isDependabotSecret}`);
    core.info(`> secret_name: ${secretName}`);

    // Setup octokit
    const octokit = github.getOctokit(githubToken);

    if (isDependabotSecret) {
      const { key, keyId } = await getDependabotPublicKey(
        octokit,
        owner,
        repository
      );
      const encrypted = encrypt(key, secretValue);
      await handleSecret({
        octokit,
        secretName,
        encrypted,
        owner,
        repository,
        keyId,
        selectedRepoIds,
        isDependabot: true,
      });
    } else {
      const { key, keyId } = await getPublicKey(octokit, owner, repository);
      const encrypted = encrypt(key, secretValue);
      await handleSecret({
        octokit,
        secretName,
        encrypted,
        owner,
        repository,
        keyId,
        selectedRepoIds,
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getDependabotPublicKey(octokit, owner, repository) {
  core.info("Requesting public key");
  const time = Date.now();
  const { status, data } = repository
    ? await octokit.request(
        "GET /repos/{owner}/{repo}/dependabot/secrets/public-key",
        {
          owner: owner,
          repo: repository,
        }
      )
    : await octokit.request("GET /orgs/{owner}/dependabot/secrets/public-key", {
        owner: owner,
      });

  core.info(`< ${status} ${Date.now() - time}ms`);
  return {
    key: data.key,
    keyId: data.key_id,
  };
}

async function getPublicKey(octokit, owner, repository) {
  core.info("Requesting public key");
  const time = Date.now();
  const { status, data } = repository
    ? await octokit.request(
        "GET /repos/{owner}/{repo}/actions/secrets/public-key",
        {
          owner: owner,
          repo: repository,
        }
      )
    : await octokit.request("GET /orgs/{owner}/actions/secrets/public-key", {
        owner: owner,
      });

  core.info(`< ${status} ${Date.now() - time}ms`);
  return {
    key: data.key,
    keyId: data.key_id,
  };
}

function encrypt(secret, value) {
  core.info("Encrypting passed value");
  // Convert the message and key to Uint8Array's (Buffer implements that interface)
  const messageBytes = Buffer.from(value);
  const keyBytes = Buffer.from(secret, "base64");

  // Encrypt using LibSodium.
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);

  // Base64 the encrypted secret
  return Buffer.from(encryptedBytes).toString("base64");
}

async function handleSecret({
  octokit,
  secretName,
  encrypted,
  owner,
  repository,
  keyId,
  selectedRepoIds,
  isDependabot,
}) {
  core.info("Creating secret");
  const time = Date.now();

  if (isDependabot) {
    const { status } = repository
      ? await octokit.rest.dependabot.createOrUpdateRepoSecret({
          owner: owner,
          repo: repository,
          secret_name: secretName,
          encrypted_value: encrypted,
          key_id: keyId,
        })
      : await octokit.rest.dependabot.createOrUpdateOrgSecret({
          org: owner,
          secret_name: secretName,
          visibility: "selected",
          selected_repository_ids: selectedRepoIds
            ? selectedRepoIds.split(",").map((i) => i.trim())
            : null,
        });
    core.info(`< ${status} ${Date.now() - time}ms`);
  } else {
    const { status } = repository
      ? await octokit.actions.createOrUpdateRepoSecret({
          owner: owner,
          repo: repository,
          secret_name: secretName,
          encrypted_value: encrypted,
          key_id: keyId,
        })
      : await octokit.actions.createOrUpdateOrgSecret({
          org: owner,
          secret_name: secretName,
          visibility: "selected",
          selected_repository_ids: selectedRepoIds
            ? selectedRepoIds.split(",").map((i) => i.trim())
            : null,
        });
    core.info(`< ${status} ${Date.now() - time}ms`);
  }

  core.info("Secret is saved");
}

run();
