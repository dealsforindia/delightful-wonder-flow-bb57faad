// Manifest of every FMHY page we mirror. Keep slugs in sync with src/content/*.md.
export interface FmhyPage {
  slug: string;
  title: string;
  short: string;
  details: string;
  color: string;
  icon: string; // lucide icon name
  group: "main" | "tools" | "meta";
  /** Optional external/anchor link used by the sidebar instead of the /$page route. */
  href?: string;
}


export const PAGES: FmhyPage[] = [
  { slug: "privacy", title: "Adblocking / Privacy", short: "Privacy", details: "Learn how to block ads, trackers and other nasty things.", color: "#D05A6E", icon: "shield", group: "main" },
  { slug: "artificial-intelligence", title: "Artificial Intelligence", short: "AI", details: "Explore the world of AI and machine learning.", color: "#91989F", icon: "bot", group: "main" },
  { slug: "video", title: "Streaming", short: "Streaming", details: "Stream, download, torrent and binge all your favourite movies and shows!", color: "#7aa2f7", icon: "tv", group: "main" },
  { slug: "audio", title: "Listening", short: "Audio", details: "Stream, download and torrent songs, podcasts and more!", color: "#7c82fe", icon: "music", group: "main" },
  { slug: "gaming", title: "Gaming", short: "Gaming", details: "Download and play all your favourite games or emulate some old but gold ones!", color: "#49d3e9", icon: "gamepad", group: "main" },
  { slug: "reading", title: "Reading", short: "Reading", details: "Whether you're a bookworm, otaku or comic book fan, find your favourite pieces of literature.", color: "#3ccd93", icon: "book", group: "main" },
  { slug: "downloading", title: "Downloading", short: "Downloads", details: "Download all your favourite software, movies, shows, music, games and more!", color: "#BEC23F", icon: "download", group: "main" },
  { slug: "torrenting", title: "Torrenting", short: "Torrents", details: "Download your favourite media using the BitTorrent protocol.", color: "#8A6BBE", icon: "magnet", group: "main" },
  { slug: "educational", title: "Educational", short: "Learning", details: "Educational content for all ages.", color: "#A8D8B9", icon: "graduation", group: "main" },
  { slug: "mobile", title: "Android / iOS", short: "Mobile", details: "All forms of content for Android and iOS.", color: "#DAC9A6", icon: "smartphone", group: "main" },
  { slug: "linux-macos", title: "Linux / macOS", short: "Linux/Mac", details: "The $HOME of Linux and macOS.", color: "#f17c67", icon: "terminal", group: "main" },
  { slug: "non-english", title: "Non-English", short: "Non-English", details: "Content in languages other than English.", color: "#FB9966", icon: "languages", group: "main" },
  { slug: "misc", title: "Miscellaneous", short: "Misc", details: "Various topics like food, travel, news, shopping, fun sites and more!", color: "#DDD23B", icon: "boxes", group: "main" },

  { slug: "internet-tools", title: "Internet Tools", short: "Internet", details: "Tools for browsing, emails, DNS, hosting and everything web.", color: "#7aa2f7", icon: "globe", group: "tools" },
  { slug: "text-tools", title: "Text Tools", short: "Text", details: "Editors, writing helpers, translators, converters.", color: "#7c82fe", icon: "type", group: "tools" },
  { slug: "developer-tools", title: "Developer Tools", short: "Dev", details: "Everything for building, shipping and running software.", color: "#49d3e9", icon: "code", group: "tools" },
  { slug: "file-tools", title: "File Tools", short: "Files", details: "Convert, compress, edit any file type.", color: "#3ccd93", icon: "file", group: "tools" },
  { slug: "image-tools", title: "Image Tools", short: "Image", details: "Editors, generators, converters and background removers.", color: "#BEC23F", icon: "image", group: "tools" },
  { slug: "video-tools", title: "Video Tools", short: "Video", details: "Editors, downloaders, encoders and streaming tools.", color: "#8A6BBE", icon: "film", group: "tools" },
  { slug: "gaming-tools", title: "Gaming Tools", short: "Game", details: "Utilities, launchers, cheats, mods and controller helpers.", color: "#A8D8B9", icon: "gamepad", group: "tools" },
  { slug: "social-media-tools", title: "Social Media Tools", short: "Social", details: "Scrapers, downloaders and privacy-friendly frontends.", color: "#DAC9A6", icon: "share", group: "tools" },
  { slug: "system-tools", title: "System Tools", short: "System", details: "OS repair, drivers, activation, ISO archives.", color: "#f17c67", icon: "cpu", group: "tools" },
  { slug: "audio-tools", title: "Audio Tools", short: "Audio Tools", details: "DAWs, editors, converters and other audio utilities.", color: "#7c82fe", icon: "music", group: "tools", href: "/audio#audio-tools" },
  { slug: "educational-tools", title: "Educational Tools", short: "Edu Tools", details: "Learning aids, note-taking, study & research helpers.", color: "#A8D8B9", icon: "graduation", group: "tools", href: "/educational#educational-tools" },
  { slug: "storage", title: "Storage", short: "Storage", details: "Cloud, file-sharing, temporary hosts.", color: "#FB9966", icon: "hard-drive", group: "tools" },


  { slug: "beginners-guide", title: "Beginners Guide", short: "Guide", details: "New to FMHY? Start here.", color: "#7aa2f7", icon: "book", group: "meta" },
  { slug: "posts", title: "Posts", short: "Posts", details: "Community write-ups and news.", color: "#DDD23B", icon: "newspaper", group: "meta" },
  { slug: "sandbox", title: "Sandbox", short: "Sandbox", details: "Experimental / staged edits.", color: "#91989F", icon: "beaker", group: "meta" },
  { slug: "feedback", title: "Feedback", short: "Feedback", details: "Report issues or suggest changes.", color: "#D05A6E", icon: "message", group: "meta" },
  { slug: "unsafe", title: "Unsafe Sites", short: "Unsafe", details: "Sites you should probably avoid.", color: "#D05A6E", icon: "alert", group: "meta" },
  { slug: "startpage", title: "Startpage", short: "Startpage", details: "The FMHY custom startpage.", color: "#3ccd93", icon: "compass", group: "meta" },
];

export const PAGE_MAP: Record<string, FmhyPage> = Object.fromEntries(PAGES.map((p) => [p.slug, p]));
