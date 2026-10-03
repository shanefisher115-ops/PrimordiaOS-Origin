# SPELL Interpreter

## Purpose
Interpret SPELL DSL for declarative operations and transformations.

## Responsibilities
- Parse SPELL source.
- Validate structure.
- Execute against PrimordiaOS context.
- Emit events for PHOM and agents.

## Interfaces
- API: executeSpell(source, ctx).
- Emits: spell.executed, spell.error.
- Consumes: tasks from agents, flows from PrimordiaFlow.

## Constraints
- Initial version may treat SPELL as JSON.
- Later versions implement full grammar + AST.
