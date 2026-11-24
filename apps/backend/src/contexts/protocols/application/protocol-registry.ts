import type { AnyCareProtocolPlugin } from "../ports/index.js";
import { PostCataractProtocolPlugin } from "../domain/post-cataract-plugin.js";

export class ProtocolRegistry {
  private readonly plugins = new Map<string, AnyCareProtocolPlugin>();

  constructor(registerDefaults = true) {
    if (registerDefaults) {
      this.register(new PostCataractProtocolPlugin() as AnyCareProtocolPlugin);
    }
  }

  register(plugin: AnyCareProtocolPlugin): void {
    this.plugins.set(plugin.protocolType, plugin);
  }

  has(protocolType: string): boolean {
    return this.plugins.has(protocolType);
  }

  getOrThrow(protocolType: string): AnyCareProtocolPlugin {
    const plugin = this.plugins.get(protocolType);
    if (!plugin) {
      throw new Error(`UNKNOWN_PROTOCOL_TYPE:${protocolType}`);
    }
    return plugin;
  }
}
