export type Category =
  | "Writing"
  | "Image"
  | "Video"
  | "Audio"
  | "Code"
  | "PDF"
  | "Design"
  | "Productivity"
  | "Data";

export type Tool = {
  name: string;
  url: string;
  tagline: string;
  category: Category;
  free: "totally-free" | "free-tier" | "trial";
  signup: "none" | "optional" | "required-but-free";
  highlight?: string;
};

export const CATEGORIES: Category[] = [
  "Writing",
  "Image",
  "Video",
  "Audio",
  "Code",
  "PDF",
  "Design",
  "Productivity",
  "Data",
];

export const TOOLS: Tool[] = [
  // Writing
  { name: "Perplexity", url: "https://www.perplexity.ai", tagline: "AI answer engine with real sources.", category: "Writing", free: "free-tier", signup: "none", highlight: "Search without login" },
  { name: "DeepL Write", url: "https://www.deepl.com/write", tagline: "Rewrite and fix grammar in 8 languages.", category: "Writing", free: "totally-free", signup: "none" },
  { name: "Hemingway Editor", url: "https://hemingwayapp.com", tagline: "Kills adverbs and bloated sentences.", category: "Writing", free: "totally-free", signup: "none" },
  { name: "AI Text Humanizer", url: "https://www.humanizeai.pro", tagline: "Bypass AI detection on your drafts.", category: "Writing", free: "free-tier", signup: "none" },
  { name: "You.com", url: "https://you.com", tagline: "Multi-model AI chat, no account required.", category: "Writing", free: "free-tier", signup: "optional" },

  // Image
  { name: "Bing Image Creator", url: "https://www.bing.com/create", tagline: "DALL·E 3 for free, 15 fast credits/day.", category: "Image", free: "free-tier", signup: "required-but-free", highlight: "DALL·E 3 free" },
  { name: "Remove.bg", url: "https://www.remove.bg", tagline: "One-click background removal.", category: "Image", free: "free-tier", signup: "none" },
  { name: "Upscayl", url: "https://upscayl.org", tagline: "Open-source AI image upscaler, offline.", category: "Image", free: "totally-free", signup: "none" },
  { name: "Cleanup.pictures", url: "https://cleanup.pictures", tagline: "Erase people, text, objects from photos.", category: "Image", free: "free-tier", signup: "none" },
  { name: "Photopea", url: "https://www.photopea.com", tagline: "Photoshop in your browser. PSD support.", category: "Image", free: "totally-free", signup: "none" },
  { name: "Krea Realtime", url: "https://www.krea.ai", tagline: "Draw and get AI images in realtime.", category: "Image", free: "free-tier", signup: "required-but-free" },

  // Video
  { name: "Runway ML", url: "https://runwayml.com", tagline: "Text-to-video, motion brush, magic tools.", category: "Video", free: "free-tier", signup: "required-but-free" },
  { name: "CapCut Web", url: "https://www.capcut.com/editor", tagline: "Full video editor with AI captions.", category: "Video", free: "totally-free", signup: "optional" },
  { name: "Kapwing", url: "https://www.kapwing.com", tagline: "Subtitle, trim, translate videos online.", category: "Video", free: "free-tier", signup: "optional" },
  { name: "unscreen", url: "https://www.unscreen.com", tagline: "Remove video backgrounds automatically.", category: "Video", free: "free-tier", signup: "none" },

  // Audio
  { name: "ElevenLabs", url: "https://elevenlabs.io", tagline: "Most realistic AI voices, 10k chars free.", category: "Audio", free: "free-tier", signup: "required-but-free" },
  { name: "Vocal Remover", url: "https://vocalremover.org", tagline: "Split any song into vocals + instrumental.", category: "Audio", free: "totally-free", signup: "none" },
  { name: "TurboScribe", url: "https://turboscribe.ai", tagline: "Free transcription, 3 files/day, 30+ langs.", category: "Audio", free: "free-tier", signup: "required-but-free" },
  { name: "Suno", url: "https://suno.com", tagline: "Generate full songs from a text prompt.", category: "Audio", free: "free-tier", signup: "required-but-free", highlight: "10 songs/day free" },

  // Code
  { name: "Val Town", url: "https://www.val.town", tagline: "Write and host tiny JS scripts online.", category: "Code", free: "free-tier", signup: "optional" },
  { name: "regex101", url: "https://regex101.com", tagline: "Build and debug regex with explanations.", category: "Code", free: "totally-free", signup: "none" },
  { name: "Carbon", url: "https://carbon.now.sh", tagline: "Beautiful screenshots of your code.", category: "Code", free: "totally-free", signup: "none" },
  { name: "Bolt.new", url: "https://bolt.new", tagline: "Prompt a full-stack app in the browser.", category: "Code", free: "free-tier", signup: "optional" },

  // PDF
  { name: "Stirling PDF", url: "https://stirlingpdf.io", tagline: "Merge, split, OCR, sign — all local.", category: "PDF", free: "totally-free", signup: "none", highlight: "50+ PDF tools" },
  { name: "iLovePDF", url: "https://www.ilovepdf.com", tagline: "Every PDF operation you'll ever need.", category: "PDF", free: "free-tier", signup: "none" },
  { name: "ChatPDF", url: "https://www.chatpdf.com", tagline: "Ask questions to any PDF document.", category: "PDF", free: "free-tier", signup: "none" },

  // Design
  { name: "Figma", url: "https://www.figma.com", tagline: "The design tool, free for 3 files.", category: "Design", free: "free-tier", signup: "required-but-free" },
  { name: "Coolors", url: "https://coolors.co", tagline: "Generate color palettes in one click.", category: "Design", free: "totally-free", signup: "none" },
  { name: "Excalidraw", url: "https://excalidraw.com", tagline: "Hand-drawn style diagrams, no account.", category: "Design", free: "totally-free", signup: "none" },
  { name: "SVG Repo", url: "https://www.svgrepo.com", tagline: "500k+ free SVG icons and vectors.", category: "Design", free: "totally-free", signup: "none" },

  // Productivity
  { name: "tldraw computer", url: "https://computer.tldraw.com", tagline: "Whiteboard where AI runs your ideas.", category: "Productivity", free: "free-tier", signup: "optional" },
  { name: "Cron for me", url: "https://cronforme.com", tagline: "Human-language cron expression builder.", category: "Productivity", free: "totally-free", signup: "none" },
  { name: "Otter.ai", url: "https://otter.ai", tagline: "Live meeting transcription and summary.", category: "Productivity", free: "free-tier", signup: "required-but-free" },

  // Data
  { name: "DuckDB Shell", url: "https://shell.duckdb.org", tagline: "Query CSVs and Parquet in your browser.", category: "Data", free: "totally-free", signup: "none" },
  { name: "OpenRefine", url: "https://openrefine.org", tagline: "Clean messy spreadsheets like a wizard.", category: "Data", free: "totally-free", signup: "none" },
  { name: "Datawrapper", url: "https://www.datawrapper.de", tagline: "Publication-quality charts in minutes.", category: "Data", free: "free-tier", signup: "optional" },
];
