import _ from "lodash";
import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { ServerlessHookMap } from "../models/serverless";
import Provider from "../provider";
import { FunctionService } from "../services/function.service";
import { EventService } from "../services/event.service";
import { extendFunctionInfos } from "../utils/util";

export class BasePlugin {
    public hooks: ServerlessHookMap;

    public provider: Provider;

    public constructor(protected serverless: Serverless, protected options: Options) {
        this.provider = (this.serverless.getProvider(Provider.getProviderName()) as any);
    }

    async getIns(): Promise<FunctionService[]> {
        const client = await this.provider.getFgClient();
        const { functions, provider = {} } = this.serverless.service;  
        log.verbose('functions->' + JSON.stringify(functions, null, 4));
        log.verbose('options->' + JSON.stringify(this.options, null, 4));
        const basicConfig = _.omit(provider, ['name', 'credentials', 'stage']);
        log.verbose('basicConfig->' + JSON.stringify(basicConfig, null, 4));
        return Object.keys(functions).map(key => {
            const config = extendFunctionInfos(functions[key]);
            return new FunctionService(client.getFunctionClient(), {
                ...basicConfig,
                ...config,
                package: this.handlerPackage(config, basicConfig),
                functionName: config.name,
                service: this.serverless.service.service,
                version: this.options.qualifier ?? 'latest',
                projectId: client.getProjectId()
            });
        });
    }

    async getFgIns() {
        const client = await this.provider.getFgClient();
        const functionObj = this.serverless.service.getFunction(this.options.function);
        const functionConfig = extendFunctionInfos(functionObj);
        log.verbose('options->' + JSON.stringify(this.options, null, 4));
        log.verbose('function->' + JSON.stringify(functionConfig, null, 4));
        const basicConfig = _.omit(this.serverless.service.provider ?? {}, ['name', 'credentials', 'stage']);
        log.verbose('basicConfig->' + JSON.stringify(basicConfig, null, 4));
        return new FunctionService(client.getFunctionClient(), {
            ...basicConfig,
            ...functionConfig,
            package: this.handlerPackage(functionConfig, basicConfig),
            functionName: functionConfig.name,
            service: this.serverless.service.service,
            version: this.options.qualifier ?? 'latest',
            projectId: client.getProjectId()
        }); 
    }

    async getEvent() {
        const argsData: any = {};
        if (this.options.path) {
            argsData.eventFile = this.options.path;
        } else if (this.options.data) {
            argsData.data = this.options.data;
        } else {
            argsData.eventStdin = true;
        }
        return await new EventService().getEvent(argsData);
    }

    private handlerPackage(funConfig: any = {}, providerConfig: any = {}) {
        if (_.isString(funConfig.package)) {
            return funConfig.package;
        }
        if (_.isString(providerConfig.package)) {
            return providerConfig.package;
        }
        return 'default';
    }
}
