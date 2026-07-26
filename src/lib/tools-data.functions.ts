import { createServerFn } from "@tanstack/react-start";
import { TOOLS } from "./tools-data.server";
import type { Tool } from "./tools-data";

export const getToolsCount = createServerFn({ method: "GET" }).handler(async () => TOOLS.length);

export const getTools = createServerFn({ method: "GET" }).handler(async () => TOOLS as Tool[]);
