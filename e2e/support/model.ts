import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { ModelInstance } from 'e2e';

/**
 * The model behind agent steps (agent.act / assert / extract). Deterministic tests need none.
 *
 * Opt-in: nothing is selected, and no quota is spent, unless `E2E_AGENT=1` or `E2E_MODEL_PROVIDER` is set. An
 * ambient API key or stored login alone does not enable agent steps.
 *
 * Picked in this order:
 *  1. `E2E_MODEL_PROVIDER` (anthropic | chatgpt | copilot | opencode | grok), when set;
 *  2. `anthropic` when `ANTHROPIC_API_KEY` is set, else `opencode` when `OPENCODE_API_KEY` is set (a machine without a login);
 *  3. the one subscription you signed in to with `bunx --no-install e2e login <openai|github-copilot|opencode-console|spacexai>`.
 * `E2E_MODEL` overrides the model id of whichever provider is selected; `bunx --no-install e2e models` lists the ids
 * your login serves.
 * Claude subscriptions cannot be used (upstream): use an API key, or Claude models through Copilot.
 */
export type ModelProvider = 'anthropic' | 'chatgpt' | 'copilot' | 'opencode' | 'grok';

const PROVIDERS: readonly ModelProvider[] = ['anthropic', 'chatgpt', 'copilot', 'opencode', 'grok'];

/** e2e's stored-login ids, mapped to the provider names above. */
const LOGIN_IDS: Record<string, ModelProvider> = {
  openai: 'chatgpt',
  'github-copilot': 'copilot',
  'opencode-console': 'opencode',
  spacexai: 'grok',
};

/** Examples from the e2e docs; your plan may serve other ids (see `e2e models`). */
const DEFAULT_MODELS: Record<ModelProvider, string> = {
  anthropic: 'claude-sonnet-5-5',
  chatgpt: 'gpt-6-luna',
  copilot: 'claude-sonnet-5',
  opencode: 'deepseek-v4.1-flash',
  grok: 'grok-4',
};

/**
 * Providers with a stored `e2e login`. Reads only the top-level provider ids of e2e's credential store
 * (`E2E_OAUTH_CREDENTIALS`, else `$XDG_CONFIG_HOME/e2e/oauth.json` or `~/.config/e2e/oauth.json`);
 * the tokens stay with e2e.
 */
function storedLogins(): ModelProvider[] {
  const file = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'e2e', 'oauth.json');
  const json = process.env.E2E_OAUTH_CREDENTIALS || (existsSync(file) ? readFileSync(file, 'utf8') : '');
  if (!json) return [];
  try {
    return Object.keys(JSON.parse(json) as object).flatMap((id) => LOGIN_IDS[id] ?? []);
  } catch {
    return [];
  }
}

type Selection = { provider: ModelProvider } | { provider: undefined; reason: string };

export function selectModelProvider(): Selection {
  const explicit = process.env.E2E_MODEL_PROVIDER;
  if (explicit) {
    if (!PROVIDERS.includes(explicit as ModelProvider)) {
      throw new Error(`E2E_MODEL_PROVIDER must be one of ${PROVIDERS.join(', ')}; got "${explicit}".`);
    }
    return { provider: explicit as ModelProvider };
  }
  if (process.env.E2E_AGENT !== '1') {
    return { provider: undefined, reason: 'agent steps are opt-in: set E2E_AGENT=1 (or E2E_MODEL_PROVIDER) to spend model quota' };
  }
  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic' };
  if (process.env.OPENCODE_API_KEY) return { provider: 'opencode' };
  const logins = storedLogins();
  const [only] = logins;
  if (only && logins.length === 1) return { provider: only };
  if (logins.length > 1) {
    return { provider: undefined, reason: `several e2e logins (${logins.join(', ')}): set E2E_MODEL_PROVIDER to pick one` };
  }
  return {
    provider: undefined,
    reason: 'no model: set ANTHROPIC_API_KEY or run `bunx --no-install e2e login <provider>` (see docs/testing.md)',
  };
}

/** The language model for a provider. Imports are dynamic so the config loads without the optional packages. */
export async function createModel(provider: ModelProvider): Promise<ModelInstance> {
  const id = process.env.E2E_MODEL || DEFAULT_MODELS[provider];
  switch (provider) {
    case 'anthropic':
      return (await import('@ai-sdk/anthropic')).anthropic(id);
    case 'chatgpt':
      return (await import('e2e/oauth/chatgpt')).chatgpt(id);
    case 'copilot':
      return (await import('e2e/oauth/copilot')).copilot(id);
    case 'opencode':
      return (await import('e2e/oauth/opencode-console')).opencodeConsole(id);
    case 'grok':
      return (await import('e2e/oauth/grok')).grok(id);
  }
}
