export type TemplateContext = {
     params: Record<string, unknown>;
     query: Record<string, unknown>;
     body: unknown;
};

/**
 * Safely read a nested property from an object using a dot path.
 */
export function getPathValue(obj: unknown, path: string): unknown {
     if (!path) return undefined;

     const parts = path.split(".");
     let current: unknown = obj;

     for (const part of parts) {
          if (current === null || current === undefined) return undefined;
          if (typeof current !== "object") return undefined;

          const record = current as Record<string, unknown>;
          current = record[part];
     }

     return current;
}

/**
 * Render string templates like {{params.id}}, {{query.type}}, {{body.email}}.
 */
export function renderStringTemplate(input: string, ctx: TemplateContext): string {
     /**
      * Replace a single template token with its resolved value.
      */
     function replaceToken(_match: string, root: string, path: string): string {
          let source: unknown;
          if (root === "params") source = ctx.params;
          else if (root === "query") source = ctx.query;
          else if (root === "body") source = ctx.body;
          else return "";

          const value = getPathValue(source, path);

          if (value === undefined || value === null) return "";
          if (typeof value === "string") return value;
          if (typeof value === "number" || typeof value === "boolean") return String(value);

          try {
               return JSON.stringify(value);
          } catch {
               return "";
          }
     }

     return input.replace(/\{\{\s*([a-zA-Z]+)\.([a-zA-Z0-9_.]+)\s*\}\}/g, replaceToken);
}
