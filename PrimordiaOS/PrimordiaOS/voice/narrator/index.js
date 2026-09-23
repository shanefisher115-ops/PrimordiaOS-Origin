export function narrate({ pulse = "diff", commentary = [] } = {}) {
  console.log(`\n🎙️ [PRIMORDIA NARRATOR] (${pulse.toUpperCase()} PULSE):`);
  commentary.forEach(line => {
    console.log(`   🗣️ "${line}"`);
  });
}