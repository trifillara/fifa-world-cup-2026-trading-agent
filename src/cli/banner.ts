import { pulse } from "./terminal";

const FIFA_BANNER = `
 ███████╗██╗███████╗ █████╗     ██████╗ ██████╗ ██████╗  ██████╗
 ██╔════╝██║██╔════╝██╔══██╗   ╚════██╗██╔═████╗╚════██╗██╔════╝
 █████╗  ██║█████╗  ███████║    █████╔╝██║██╔██║ █████╔╝███████╗
 ██╔══╝  ██║██╔══╝  ██╔══██║   ██╔═══╝ ████╔╝██║██╔═══╝ ██╔═══██╗
 ██║     ██║██║     ██║  ██║   ███████╗╚██████╔╝███████╗╚██████╔╝
 ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝   ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝
`;

export function printBanner(): void {
  pulse.banner(`\x1b[36m${FIFA_BANNER.trimEnd()}\x1b[0m`);
  pulse.banner(`\x1b[2m  Polymarket World Cup Copy Trading Bot · FIFA 2026\x1b[0m`);
  pulse.banner("");
}
