import _ from "lodash";
import Serverless, { Options } from "serverless";
import { ServerlessHookMap } from "../models/serverless";
import Provider from "../provider";
import { EventService } from "../services/event.service";
import { extendFunctionInfos, handlerUrn } from "../utils/util";
import { PluginService } from "../services/plugin.service";
import { Logger } from "serverless-fgs-sdk";

export class BasePlugin {
    public hooks: ServerlessHookMap;

    public provider: Provider;

    private pOptions: Record<string, any> = {}

    public constructor(protected serverless: Serverless, protected options: Options) {
        this.provider = (this.serverless.getProvider(Provider.getProviderName()) as any);
        this.handlerOptions();
    }

    get singleFunction() {
        return this.pOptions.function;
    }
    /**
     * 获取函数client
     * @returns 数组
     */
    async getIns(): Promise<PluginService[]> {
        const client = await this.provider.getFgClient();
        const { functions, provider = {} } = this.serverless.service;
        const basicConfig = _.omit(provider, ['name', 'credentials', 'stage']);
        Logger.getIns().debug('getIns->' + JSON.stringify({ functions, basicConfig, options: this.pOptions }));
        const projectId = client.projectId;
        return Object.keys(functions).filter(f => !this.pOptions.function || this.pOptions.function === f).map(key => {
            const functionConfig = this.getFgsInfos(basicConfig, { ...functions[key], fName: key }, projectId);
            Logger.getIns().debug(`getIns fgs[${key}] info -> ${JSON.stringify(functionConfig)}`);
            return new PluginService(client, functionConfig);
        });
    }

    /**
     * 获取测试事件内容
     * @returns 
     */
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

    private handlerOptions() {
        const params: any = this.options?.param ?? [];
        this.pOptions = _.merge({}, this.options ?? {}, params.reduce((prev, next) => {
            const [key, value] = next.split('=').map(a => a.trim());
            prev[key] = value;
            return prev;
        }, {}));

    }
    /**
     * 获取函数信息
     * @param providerConfig provider信息
     * @param functionObj 函数信息
     * @returns 
     */
    private getFgsInfos(providerConfig: any = {}, functionObj: any = {}, projectId = '') {
        const functionConfig = _.omit(extendFunctionInfos(functionObj), ['events']);
        const events = this.getFgsEvents(functionConfig.fName);
        const funPackage = this.handlerPackage(functionConfig, providerConfig);
        const funVersion = `${this.options.qualifier ?? 'latest'}`;
        const urn = handlerUrn(this.provider.region, projectId, funPackage, functionConfig.name, funVersion);
        return {
            subCommand: this.handlerSubCommand(),
            events,
            functions: {
                ...providerConfig,
                ...functionConfig,
                package: funPackage,
                version: funVersion,
                urn
            }
        };
    }

    /**
     * 获取函数触发器信息
     * @param funcName 函数名称
     * @returns 触发器信息
     */
    private getFgsEvents(funcName = '') {
        const triggerType = this.pOptions.trigger?.toLocaleLowerCase();
        const allEvents = this.serverless.service.getAllEventsInFunction(funcName);
        if (!triggerType) {
            return allEvents;
        }
        return allEvents.filter((e: any) => e.triggerTypeCode?.toLocaleLowerCase() === triggerType);
    }

    /**
     * 处理函数Package字段
     * @param funConfig 函数信息
     * @param providerConfig provider信息
     * @returns 
     */
    private handlerPackage(funConfig: any = {}, providerConfig: any = {}) {
        if (_.isString(funConfig.package)) {
            return funConfig.package;
        }
        if (_.isString(providerConfig.package)) {
            return providerConfig.package;
        }
        return 'default';
    }

    private handlerSubCommand() {
        const func = this.pOptions.function;
        const trigger = this.pOptions.trigger;
        if (trigger) {
            return 'trigger';
        }
        if (func) {
            return 'function';
        }
        return 'all';
    }
}
