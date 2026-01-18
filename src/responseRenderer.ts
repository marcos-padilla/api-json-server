import { faker as baseFaker, type Faker } from "@faker-js/faker";
import type { FakerTemplate, RepeatTemplate, TemplateValue } from "./spec.js";
import { renderStringTemplate, type TemplateContext } from "./stringTemplate.js";

export type RenderContext = TemplateContext & {
     faker: Faker;
};

/**
 * Create a render context with an optional faker seed applied.
 */
export function createRenderContext(ctx: TemplateContext, fakerSeed?: number): RenderContext {
     if (typeof fakerSeed === "number") {
          baseFaker.seed(fakerSeed);
     }
     return { ...ctx, faker: baseFaker };
}

/**
 * Check if a template value is a faker directive.
 */
function isFakerTemplate(value: TemplateValue): value is FakerTemplate {
     return typeof value === "object" && value !== null && !Array.isArray(value) && "__faker" in value;
}

/**
 * Check if a template value is a repeat directive.
 */
function isRepeatTemplate(value: TemplateValue): value is RepeatTemplate {
     return typeof value === "object" && value !== null && !Array.isArray(value) && "__repeat" in value;
}

/**
 * Resolve a faker method path (e.g. "person.firstName") to a callable function.
 */
function resolveFakerMethod(faker: Faker, methodPath: string): (...args: unknown[]) => unknown {
     const parts = methodPath.split(".");
     let current: unknown = faker;

     for (const part of parts) {
          if (current === null || current === undefined) {
               throw new Error(`Faker method not found: ${methodPath}`);
          }
          if (typeof current !== "object" && typeof current !== "function") {
               throw new Error(`Faker method not found: ${methodPath}`);
          }

          const record = current as Record<string, unknown>;
          current = record[part];
     }

     if (typeof current !== "function") {
          throw new Error(`Faker method is not callable: ${methodPath}`);
     }

     return current as (...args: unknown[]) => unknown;
}

/**
 * Render a faker directive to a concrete value.
 */
function renderFakerTemplate(template: FakerTemplate, ctx: RenderContext): unknown {
     const faker = ctx.faker;
     const raw = template.__faker;
     const methodPath = typeof raw === "string" ? raw : raw.method;
     const args = typeof raw === "string" ? [] : raw.args ?? [];
     const renderedArgs = args.map((arg) => renderTemplateValue(arg, ctx));
     const method = resolveFakerMethod(faker, methodPath);
     return method(...renderedArgs);
}

/**
 * Render a repeat directive to an array of rendered items.
 */
function renderRepeatTemplate(template: RepeatTemplate, ctx: RenderContext): unknown[] {
     const faker = ctx.faker;
     const { count, min, max, template: itemTemplate } = template.__repeat;
     const minValue = typeof min === "number" ? min : 0;

     if (typeof count === "number") {
          return Array.from({ length: count }, () => renderTemplateValue(itemTemplate, ctx));
     }

     const upper = typeof max === "number" ? max : minValue;
     if (upper < minValue) {
          throw new Error(`Repeat max must be >= min (min=${minValue}, max=${upper})`);
     }

     const total = faker.number.int({ min: minValue, max: upper });
     return Array.from({ length: total }, () => renderTemplateValue(itemTemplate, ctx));
}

/**
 * Render a template value into a concrete JSON-compatible value.
 */
export function renderTemplateValue(value: TemplateValue, ctx: RenderContext): unknown {
     if (typeof value === "string") return renderStringTemplate(value, ctx);
     if (typeof value === "number" || typeof value === "boolean" || value === null) return value;

     if (Array.isArray(value)) {
          return value.map((item) => renderTemplateValue(item, ctx));
     }

     if (isFakerTemplate(value)) return renderFakerTemplate(value, ctx);
     if (isRepeatTemplate(value)) return renderRepeatTemplate(value, ctx);

     const output: Record<string, unknown> = {};
     for (const [key, item] of Object.entries(value)) {
          output[key] = renderTemplateValue(item, ctx);
     }
     return output;
}
