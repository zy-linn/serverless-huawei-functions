import Serverless, { Options } from "serverless";
import { DeployPlugin } from "./plugins/deploy";
import { RemovePlugin } from "./plugins/remove";
import Provider from "./provider";
import { InfoPlugin } from "./plugins/info";
import { InvokePlugin } from "./plugins/invoke";
import { LocalPlugin } from "./plugins/local";

export default class HuaweiIndex {

    public constructor(private readonly serverless: Serverless, private readonly options: Options) {
        this.serverless.setProvider(Provider.getProviderName(), new Provider(this.serverless, this.options) as any);

        this.serverless.pluginManager.addPlugin(DeployPlugin as any);
        this.serverless.pluginManager.addPlugin(RemovePlugin as any);
        this.serverless.pluginManager.addPlugin(InfoPlugin as any);
        this.serverless.pluginManager.addPlugin(InvokePlugin as any);
        this.serverless.pluginManager.addPlugin(LocalPlugin as any);
    }
}

module.exports = HuaweiIndex;
