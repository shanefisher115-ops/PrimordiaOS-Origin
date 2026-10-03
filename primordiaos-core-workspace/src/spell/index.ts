export interface SpellContext {
  realm: string;
  emit: (topic: string, payload: unknown) => Promise<void>;
}

export async function executeSpell(source: string, ctx: SpellContext): Promise<unknown> {
  try {
    const parsed = JSON.parse(source);
    await ctx.emit("spell.executed", { realm: ctx.realm, payload: parsed });
    return parsed;
  } catch (err) {
    throw new Error(SPELL parse error: );
  }
}
