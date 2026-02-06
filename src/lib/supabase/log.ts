export function logError(
    context: string,
    error: unknown,
    extra?: Record<string, unknown>
  ) {
    const err =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: error };
  
    console.error(`[QuickNotes] ${context}`, {
      ...err,
      ...extra,
      ts: new Date().toISOString(),
    });
  }