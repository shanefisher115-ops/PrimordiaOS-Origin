# Run instructions

1. Install deps:
   npm install

2. Optional: create local enable token to allow dangerous actions:
   echo "your-passphrase" > ENABLE_TOKEN.txt
   set PRIMORDIAL_ENABLE_TOKEN=your-passphrase
   set PRIMORDIAL_ALLOW_DANGEROUS=true

3. Optional: configure LLM:
   set PRIMORDIAL_LLM_PROVIDER=openai
   set PRIMORDIAL_LLM_KEY=sk-...

4. Start:
   npm start
