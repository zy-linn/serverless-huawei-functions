import _ from "lodash";
import Serverless, { Options } from "serverless";
import { ServerlessHookMap } from "../models/serverless";
import Provider from "../provider";
import { FunctionService } from "../services/function.service";

export class BasePlugin {
    public hooks: ServerlessHookMap;

    private provider: Provider;

    public constructor(protected serverless: Serverless, protected options: Options) {
        this.provider = (this.serverless.getProvider(Provider.getProviderName()) as any);
    }

    async getIns(): Promise<FunctionService[]> {
        const client = await this.provider.getFgClient();
        const { functions, provider = {} } = this.serverless.service;
        const basicConfig = _.omit(provider, ['name', 'credentials', 'stage']);
        return Object.keys(functions).map(key => {
            return new FunctionService(client.getFunctionClient(), {
                ...basicConfig,
                ...functions[key],
                projectId: client.getProjectId()
            });
        });
    }
}
