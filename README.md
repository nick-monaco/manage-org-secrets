# Manage Github Organization Secrets

Github Action to save a repository, organization or dependabot secret.

## Usage

```yaml
uses: nick-monaco/manage-secrets@v1.0.0
with:
  # Your own repository or organisation-wide GitHub token that has repo permissions 
  github_token: ${{ secrets.GITHUB_TOKEN }}
  repository: ${{ github.repository }} # Not required
  owner: ${{ github.owner }}
  dependabot: true/false # Not required, for saving dependabot secrets
  secret_name: YOUR_SECRET_NAME
  secret_value: "value to be encoded"
  selected_repository_ids: "[repo1ID, repo2ID]" # Which repo you want the secret visible to (only for org secrets)
```

## Example

```yaml
name: Refresh CodeArtifact token

on:
  # For manual dispatch
  workflow_dispatch:
  schedule:
    - cron: '0 */8 * * *'
jobs:
  save-codeartifact-token:
    runs-on: self-hosted
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-central-1

      - name: Get CodeArtifact token
        id: codeartifact-token
        run: echo "::set-output name=token::$(aws codeartifact get-authorization-token --domain name_of_domain --domain-owner 1234567890 --query authorizationToken --output text)"

      - name: Save the CodeArtifact dependabot secret
        id: manage-secrets
        uses: nick-monaco/manage-secrets@v1.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          owner: ${{ github.owner }}
          dependabot: true
          secret_name: CODEARTIFACT_TOKEN
          secret_value: ${{ steps.codeartifact-token.outputs.token }} 
```
