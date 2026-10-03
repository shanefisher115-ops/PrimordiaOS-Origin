import { direct } from '../modules/video-director';
import { sendEvent } from '../modules/event-sender';

export function runPrompt(text: string) {
  const plan = direct(text);
  sendEvent(plan.event);
  console.log('PLAN:', JSON.stringify(plan, null, 2));
}