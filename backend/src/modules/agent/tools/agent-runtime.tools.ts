import { HttpError } from "../../../http-error.js";
import { getSettings, updateSettings } from "../../settings/settings.service.js";
import {
  shouldUseProviderCaching,
  supportsPromptCacheKey,
  usesPassivePrefixCaching,
} from "../agent.cache-policy.service.js";
import type { AgentTool } from "../agent.tool.types.js";

function providerHost(baseUrl: string) {
  try {
    return new URL(baseUrl.trim()).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function assertConfirmed(value: unknown, message: string) {
  if (value !== true) throw new HttpError(400, message);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isTimeString(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export const agentRuntimeTools: AgentTool[] = [
  {
    name: "agent_runtime_status",
    description:
      "Inspect read-only Agent runtime feature flags and provider cache policy. Does not expose API keys.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async execute() {
      const settings = await getSettings();
      return {
        agent: {
          progressiveDisclosureEnabled: true,
          providerCachingEnabled: true,
          checkpointEnabled: true,
          seedOnResumeEnabled: true,
          upgradeDebugEventsEnabled: true,
          permissionProfile: settings.agent.permissionProfile,
          morningBrief: settings.agent.morningBrief,
        },
        llm: {
          apiFormat: settings.llm.apiFormat,
          providerHost: providerHost(settings.llm.baseUrl),
          modelId: settings.llm.modelId,
          hasApiKey: settings.llm.apiKey.length > 0,
        },
        providerCaching: {
          active: shouldUseProviderCaching(settings.llm, true),
          promptCacheKeySupported: supportsPromptCacheKey(settings.llm),
          passivePrefixCaching: usesPassivePrefixCaching(settings.llm),
        },
      };
    },
  },
  {
    name: "agent_morning_brief_update",
    description:
      "Update the Agent morning brief preference and its managed daily scheduled task. Explain the enabled state and HH:MM Asia/Hong_Kong delivery time before calling. The 1052 runtime requests exact approval under the default profile; danger-full-access may execute directly. This does not send a brief immediately or enable external channel delivery.",
    parameters: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "Whether the daily morning brief is enabled.",
        },
        time: {
          type: "string",
          description:
            "Preferred delivery time in 24-hour HH:MM format, Asia/Hong_Kong.",
        },
        confirmed: {
          type: "boolean",
          description: "Must be true after explicit user confirmation.",
        },
      },
      required: ["confirmed"],
      additionalProperties: false,
    },
    async execute(args) {
      const input = (args ?? {}) as Record<string, unknown>;
      assertConfirmed(
        input.confirmed,
        "Morning brief settings require explicit confirmation.",
      );

      const patch: { enabled?: boolean; time?: string } = {};
      if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
      if (input.time !== undefined) {
        const time = readString(input.time);
        if (!isTimeString(time)) {
          throw new HttpError(400, "Morning brief time must use HH:MM format.");
        }
        patch.time = time;
      }
      if (patch.enabled === undefined && patch.time === undefined) {
        throw new HttpError(
          400,
          "Nothing to update for morning brief settings.",
        );
      }

      const settings = await updateSettings({ agent: { morningBrief: patch } });
      return { morningBrief: settings.agent.morningBrief };
    },
  },
];
