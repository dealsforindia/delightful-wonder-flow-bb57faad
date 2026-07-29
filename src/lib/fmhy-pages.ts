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
  { slug: "privacy", title: "Adblocking / Privacy", short: "Privacy", details: "Learn how to block ads, trackers and other nasty things.", color: "#22d3ee", icon: "shield", group: "main" },
  { slug: "artificial-intelligence", title: "Artificial Intelligence", short: "AI", details: "Explore the world of AI and machine learning.", color: "#b8f51a", icon: "bot", group: "main" },
  { slug: "video", title: "Streaming", short: "Streaming", details: "Stream, download, torrent and binge all your favourite movies and shows!", color: "#e879f9", icon: "tv", group: "main" },
  { slug: "audio", title: "Listening", short: "Audio", details: "Stream, download and torrent songs, podcasts and more!", color: "#f472b6", icon: "music", group: "main" },
  { slug: "gaming", title: "Gaming", short: "Gaming", details: "Download and play all your favourite games or emulate some old but gold ones!", color: "#4ade80", icon: "gamepad", group: "main" },
  { slug: "reading", title: "Reading", short: "Reading", details: "Whether you're a bookworm, otaku or comic book fan, find your favourite pieces of literature.", color: "#a78bfa", icon: "book", group: "main" },
  { slug: "downloading", title: "Downloading", short: "Downloads", details: "Download all your favourite software, movies, shows, music, games and more!", color: "#fbbf24", icon: "download", group: "main" },
  { slug: "torrenting", title: "Torrenting", short: "Torrents", details: "Download your favourite media using the BitTorrent protocol.", color: "#fb923c", icon: "magnet", group: "main" },
  { slug: "educational", title: "Educational", short: "Learning", details: "Educational content for all ages.", color: "#2dd4bf", icon: "graduation", group: "main" },
  { slug: "mobile", title: "Android / iOS", short: "Mobile", details: "All forms of content for Android and iOS.", color: "#f87171", icon: "smartphone", group: "main" },
  { slug: "linux-macos", title: "Linux / macOS", short: "Linux/Mac", details: "The $HOME of Linux and macOS.", color: "#94a3b8", icon: "terminal", group: "main" },
  { slug: "non-english", title: "Non-English", short: "Non-English", details: "Content in languages other than English.", color: "#facc15", icon: "languages", group: "main" },
  { slug: "misc", title: "Miscellaneous", short: "Misc", details: "Various topics like food, travel, news, shopping, fun sites and more!", color: "#c084fc", icon: "boxes", group: "main" },

  { slug: "internet-tools", title: "Internet Tools", short: "Internet", details: "Tools for browsing, emails, DNS, hosting and everything web.", color: "#22d3ee", icon: "globe", group: "tools" },
  { slug: "text-tools", title: "Text Tools", short: "Text", details: "Editors, writing helpers, translators, converters.", color: "#e879f9", icon: "type", group: "tools" },
  { slug: "developer-tools", title: "Developer Tools", short: "Dev", details: "Everything for building, shipping and running software.", color: "#b8f51a", icon: "code", group: "tools" },
  { slug: "file-tools", title: "File Tools", short: "Files", details: "Convert, compress, edit any file type.", color: "#4ade80", icon: "file", group: "tools" },
  { slug: "image-tools", title: "Image Tools", short: "Image", details: "Editors, generators, converters and background removers.", color: "#fbbf24", icon: "image", group: "tools" },
  { slug: "video-tools", title: "Video Tools", short: "Video", details: "Editors, downloaders, encoders and streaming tools.", color: "#a78bfa", icon: "film", group: "tools" },
  { slug: "gaming-tools", title: "Gaming Tools", short: "Game", details: "Utilities, launchers, cheats, mods and controller helpers.", color: "#2dd4bf", icon: "gamepad", group: "tools" },
  { slug: "social-media-tools", title: "Social Media Tools", short: "Social", details: "Scrapers, downloaders and privacy-friendly frontends.", color: "#f472b6", icon: "share", group: "tools" },
  { slug: "system-tools", title: "System Tools", short: "System", details: "OS repair, drivers, activation, ISO archives.", color: "#fb923c", icon: "cpu", group: "tools" },
  { slug: "audio-tools", title: "Audio Tools", short: "Audio Tools", details: "DAWs, editors, converters and other audio utilities.", color: "#e879f9", icon: "music", group: "tools", href: "/audio#audio-tools" },
  { slug: "educational-tools", title: "Educational Tools", short: "Edu Tools", details: "Learning aids, note-taking, study & research helpers.", color: "#4ade80", icon: "graduation", group: "tools", href: "/educational#educational-tools" },
  { slug: "storage", title: "Storage", short: "Storage", details: "Cloud, file-sharing, temporary hosts.", color: "#facc15", icon: "hard-drive", group: "tools" },


  { slug: "beginners-guide", title: "Beginners Guide", short: "Guide", details: "New here? Start with this.", color: "#22d3ee", icon: "book", group: "meta" },
  { slug: "posts", title: "Posts", short: "Posts", details: "Community write-ups and news.", color: "#facc15", icon: "newspaper", group: "meta" },
  { slug: "faq", title: "FAQ", short: "FAQ", details: "Frequently asked questions.", color: "#a78bfa", icon: "help", group: "meta" },
  { slug: "contributing", title: "Contributing", short: "Contribute", details: "How to help improve and grow the wiki.", color: "#4ade80", icon: "hand", group: "meta" },
  { slug: "selfhosting", title: "Self-Hosting", short: "Self-Host", details: "Host Unlocked yourself for full offline access.", color: "#b8f51a", icon: "server", group: "meta" },
  { slug: "wallpapers", title: "Wallpapers", short: "Wallpapers", details: "Community-curated wallpaper packs.", color: "#c084fc", icon: "image", group: "meta" },
  { slug: "sandbox", title: "Sandbox", short: "Sandbox", details: "Experimental / staged edits.", color: "#94a3b8", icon: "beaker", group: "meta" },
  { slug: "feedback", title: "Feedback", short: "Feedback", details: "Report issues or suggest changes.", color: "#f87171", icon: "message", group: "meta" },
  { slug: "unsafe", title: "Unsafe Sites", short: "Unsafe", details: "Sites you should probably avoid.", color: "#ef4444", icon: "alert", group: "meta" },
  { slug: "startpage", title: "Startpage", short: "Startpage", details: "The Unlocked custom startpage.", color: "#2dd4bf", icon: "compass", group: "meta" },
];

export const PAGE_MAP: Record<string, FmhyPage> = Object.fromEntries(PAGES.map((p) => [p.slug, p]));
