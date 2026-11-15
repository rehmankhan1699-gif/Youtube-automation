# Youtube-automation

Surah video automation for an Urdu Islamic YouTube channel.

## Agent: `surah-studio`

Say **`next`** in the agent playground to produce the next Surah package:

1. 7–8 min Urdu crux script  
2. ElevenLabs Urdu voiceover  
3. Motion-graphics brief  
4. Keyword research  
5. YouTube + Instagram captions  
6. Best posting-time research + clip schedule  

```bash
cd surah-studio
cp .env.example .env   # add ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID
npx @grok/agent-sdk login
npx @grok/agent-sdk dev
```

See `surah-studio/AGENTS.md` for the develop loop.

## 20s test video

A rendered sample lives at:

`surah-studio/packages/surah-001/test-20s.mp4`

Re-render with:

```bash
cd surah-studio
python3 scripts/render_test_20s.py
```
