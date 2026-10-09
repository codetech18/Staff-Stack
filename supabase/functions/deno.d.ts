// Minimal ambient interfaces for offline TypeScript checks; actual runtime is Supabase Deno.
declare const Deno: {
 env: { get(name: string): string | undefined }
 serve(handler: (request: Request) => Response | Promise<Response>): void
}
