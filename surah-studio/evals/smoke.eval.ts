import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Playlist status tool reports Surah series progress.",
  async test(t) {
    await t.send(
      "What is the current Surah playlist progress? Use the playlist_status tool.",
    );
    t.succeeded();
    t.calledTool("playlist_status");
  },
});
