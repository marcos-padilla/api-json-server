import type { TemplateValue } from "./spec.js";

export type BehaviorSettings = {
     delayMs: number;
     errorRate: number;
     errorStatus: number;
     errorResponse: TemplateValue;
};

export type BehaviorOverrides = Partial<BehaviorSettings>;

/**
 * Pause for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
     return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decide whether a request should fail based on an error rate.
 */
export function shouldFail(errorRate: number): boolean {
     if (errorRate <= 0) return false;
     if (errorRate >= 1) return true;
     return Math.random() < errorRate;
}

/**
 * Resolve behavior settings with precedence: chosen overrides -> endpoint overrides -> global settings.
 */
export function resolveBehavior(
     settings: BehaviorSettings,
     endpointOverrides?: BehaviorOverrides,
     chosenOverrides?: BehaviorOverrides
): BehaviorSettings {
     return {
          delayMs: chosenOverrides?.delayMs ?? endpointOverrides?.delayMs ?? settings.delayMs,
          errorRate: chosenOverrides?.errorRate ?? endpointOverrides?.errorRate ?? settings.errorRate,
          errorStatus: chosenOverrides?.errorStatus ?? endpointOverrides?.errorStatus ?? settings.errorStatus,
          errorResponse: chosenOverrides?.errorResponse ?? endpointOverrides?.errorResponse ?? settings.errorResponse
     };
}
