import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { BasePlugin } from '../basePlugin';
import { extendFunctionInfos } from "../../utils/util";
import _ from "lodash";
import { PortService } from "../../services/port.service";
import { ApiService } from "../../services/api.service";
import { IFunctionConfig } from "../../models/interface";
import path from "path";
import { exec } from "child_process";
export class LocalPlugin extends BasePlugin {
    private apiService: ApiService;

    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "invoke:local:invoke": this.local.bind(this),
        };
        this.apiService = new ApiService();
    }

    private async local() {
        try {
            await this.invoke();
        } catch (error) {
            log.error('Local error.' + (error as Error).message);
        }
    }

    public async invoke() {
        if (!this.options.function) {
            throw new Error('Function is required. Please specify with --function');
        }
        const functionObj = this.serverless.service.getFunction(this.options.function);
        const functionConfig = extendFunctionInfos(functionObj);
        if (_.isEmpty(functionObj)) {
            throw new Error(`Please add function [${this.options.function}] config in your serverless.yml/yaml and retry start.`);
        }
        log.verbose('options -> ' + JSON.stringify(this.options, null, 4));
        log.verbose('functionConfig -> ' + JSON.stringify(functionConfig, null, 4));
        await this.setPort(functionConfig.name);
        const port = await PortService.getInstance().getPort(functionConfig.name);
        try {
            const result = await this.handlerNormal(functionConfig, port);
            log.notice(`result: ${JSON.stringify(result, null, 4)}`);
        } catch (error) {
            await this.apiService.stopProcess(port);
            throw error;
        }
    }

    private handlerEnvsVars(functions: IFunctionConfig, projectId: string = ''): string {
        const handlers = functions.handler?.split('.') ?? [];
        const handler = handlers.pop();
        const entry = path.resolve(functions.code?.codeUri ?? './src', [...handlers, 'js'].join('.'));
        const envs = {
            funcEnv: {
                RUNTIME_FUNC_NAME: functions.functionName,
                RUNTIME_PACKAGE: "default",
                RUNTIME_PROJECT_ID: projectId,
                RUNTIME_FUNC_VERSION: "lastest",
                RUNTIME_MEMORY: functions.memorySize,
                RUNTIME_USERDATA: JSON.stringify(this.handlerEnvs(functions)),
                RUNTIME_TIMEOUT: functions.timeout
            },
            entry,
            handler,
        };
        log.verbose(`handlerEnvs -> ${JSON.stringify(envs)}`);
        return Buffer.from(JSON.stringify(envs), 'utf-8').toString('base64');
    }

    /**
     * 设置端口号
     * @param functionName 
     * @param serverPort 
     */
    private async setPort(functionName: string, serverPort?: number) {
        const port = serverPort || await PortService.getInstance().getPort(functionName, true);
        PortService.getInstance().setPort(functionName, port);
    }

    private async startExpress(functions: IFunctionConfig, port: number, isDebug = false): Promise<boolean> {
        log.verbose('startExpress port -> ' + port);
        const envs = this.handlerEnvsVars(functions);
        const command = `node ${path.join(__dirname, 'app.js')} ${port} ${envs}`;
        log.verbose('stat command: ' + command);
        exec(command.split('\\').join('/'));
        const result = await this.apiService.checkContainer(port, isDebug);
        if (result) {
            return true;
        }
        throw new Error('start error');
    }

    private async handlerNormal(props: IFunctionConfig, port) {
        const event = await this.getEvent();
        await this.startExpress(props, port);
        const invoke = await this.apiService.invokeFunction(event, port);
        await this.apiService.sleep(); // 停止 500ms
        await this.apiService.stopProcess(port);
        return invoke;
    }

    private handlerEnvs(functions: IFunctionConfig) {
        const envs = functions.userData ?? functions.environment ?? {};
        if (!this.options.env) {
            return envs;
        }
        (this.options.env as any).forEach(e => {
            const [key, value = ''] = e.split('=');
            value && (envs[key] = value);
        });
        return envs;
    }
}