declare module '@neondatabase/serverless' {
  export function neon(connectionString: string): (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
}
