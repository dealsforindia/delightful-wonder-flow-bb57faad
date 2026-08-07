// Auto-generated from FMHY (github.com/fmhy/edit) — complete link scrape
export type Category =
  | "AI" | "Audio" | "Code" | "Downloads" | "Files" | "Gaming" | "Guides" | "Image" | "Internet" | "Learning" | "Linux/Mac" | "Misc" | "Mobile" | "Non-English" | "Privacy" | "Reading" | "Social" | "Storage" | "System" | "Torrenting" | "Video" | "Writing";

export interface Tool {
  name: string;
  url: string;
  category: Category;
  section: string;
  /** Short plain-text blurb scraped from the wiki line (may be empty). */
  description?: string;
  /** Markers like "recommended", "open source", "self-hostable", "signup", "paid", platforms. */
  tags?: string[];
}

export const CATEGORIES: Category[] = ["AI", "Audio", "Code", "Downloads", "Files", "Gaming", "Guides", "Image", "Internet", "Learning", "Linux/Mac", "Misc", "Mobile", "Non-English", "Privacy", "Reading", "Social", "Storage", "System", "Torrenting", "Video", "Writing"];

