export async function postToConsole(platform, content) {
  console.log(`[Promotion:${platform}]`, content.text, content.tags.join(' '));
}
