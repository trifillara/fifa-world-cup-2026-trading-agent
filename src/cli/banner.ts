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
  pulse.banner(`\x1b[2m  Polymarket FIFA 2026 World Cup · AI Trading Agent\x1b[0m`);
  pulse.banner(`\x1b[2m  AI match modelling · copy trading · draw control\x1b[0m`);
  pulse.banner("");
}
