import { textToEvent } from './text2event';
import { sendEvent } from './event-sender';
export function generateVideoFromText(text: string) {
  const evt = textToEvent(text);
  sendEvent(evt);
}