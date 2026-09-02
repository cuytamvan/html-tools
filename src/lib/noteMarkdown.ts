import { createMarkdownParser } from 'comark';
import shiki from 'comark/plugins/shiki';

export const parseNoteMarkdown = createMarkdownParser({
  plugins: [
    shiki({
      preStyles: true,
    }),
  ],
});
