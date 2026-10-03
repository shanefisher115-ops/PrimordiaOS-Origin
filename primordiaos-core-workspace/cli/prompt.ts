import { runPrompt } from '../runtime/index';

const text = process.argv.slice(2).join(' ') || 'spawn pulse nebula';
runPrompt(text);