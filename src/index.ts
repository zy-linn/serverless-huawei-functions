import Serverless, { Options } from "serverless";
import { DeployPlugin } from "./plugins/deploy";
import { RemovePlugin } from "./plugins/remove";
import Provider from "./provider";

export default class HuaweiIndex {

    public constructor(private readonly serverless: Serverless, private readonly options: Options) {
        this.serverless.setProvider(Provider.getProviderName(), new Provider(this.serverless, this.options) as any);

        this.serverless.pluginManager.addPlugin(DeployPlugin);
        this.serverless.pluginManager.addPlugin(RemovePlugin);
    }
}

module.exports = HuaweiIndex;
