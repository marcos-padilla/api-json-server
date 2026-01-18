type TemplateContext = {
     params: Record<string, unknown>;
     query: Record<string, unknown>;
     body: unknown;
};

function getPath(obj: unknown, path: string): unknown {
     if (!path) return undefined;

     const parts = path.split(".");
     let cur: any = obj;

     for (const p of parts) {
          if (cur == null) return undefined;
          cur = cur[p];
     }
     return cur;
}

function renderStringTemplate(input: string, ctx: TemplateContext): string {
     // Replaces occurrences like {{params.id}} or {{query.type}} or {{body.email}}
     return input.replace(/\{\{\s*([a-zA-Z]+)\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, root, path) => {
          let source: unknown;
          if (root === "params") source = ctx.params;
          else if (root === "query") source = ctx.query;
          else if (root === "body") source = ctx.body;
          else return "";

          const value = root === "body" ? getPath(source, path) : getPath(source, path);

          if (value === undefined || value === null) return "";
          if (typeof value === "string") return value;
          if (typeof value === "number" || typeof value === "boolean") return String(value);

          // For objects/arrays, stringify to keep output valid (still a string substitution)
          try {
               return JSON.stringify(value);
          } catch {
               return "";
          }
     });
}

export function renderTemplate(value: unknown, ctx: TemplateContext): unknown {
     if (typeof value === "string") return renderStringTemplate(value, ctx);

     if (Array.isArray(value)) {
          return value.map((v) => renderTemplate(v, ctx));
     }

     if (value && typeof value === "object") {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
               out[k] = renderTemplate(v, ctx);
          }
          return out;
     }

     // numbers, booleans, null, undefined stay as-is
     return value;
}
