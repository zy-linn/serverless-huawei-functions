import {
    FuncCode,
    CreateFunctionRequest,
    CreateFunctionRequestBody,
    CreateFunctionRequestBodyCodeTypeEnum,
    CreateFunctionRequestBodyRuntimeEnum,
    CreateFunctionRequestBodyTypeEnum,
    DeleteFunctionRequest,
    FunctionGraphClient,
    ShowFunctionConfigRequest,
    UpdateFunctionCodeRequest,
    UpdateFunctionCodeRequestBody,
    UpdateFunctionCodeRequestBodyCodeTypeEnum,
    InvokeFunctionRequest,
    ListFunctionTriggersRequest,
    UpdateFunctionConfigRequestBody,
    UpdateFunctionConfigRequestBodyRuntimeEnum,
    FuncLogConfig,
    StrategyConfig,
    FuncVpc,
    NetworkControlConfig,
    UpdateFunctionConfigRequest,
} from "@huaweicloud/huaweicloud-sdk-functiongraph";
import { log } from '@serverless/utils/log';
import _ from 'lodash';
import { AdvancedConfig, BasicConfig, ConcurrencyConfig, IFunctionConfig, IFunctionProps, IFunctionResult, LogConfig, NetConfig, PermissionConfig } from "../models/interface";
import { handlerResponse, startZip } from "../utils/util";

type RequestBody = UpdateFunctionConfigRequestBody | CreateFunctionRequestBody;

export class FunctionService {
    private functionInfo: IFunctionProps;
    private functionUrn = '';
    private metaData: any;
    private logMap = {
        createFunction: {
            success: `Function {name} is created successfully.`,
            failed: `Failed to create Function {name}.`
        },
        deleteFunction: {
            success: `Function {name} is deleted successfully.`,
            failed: `Failed to delete Function {name}.`
        },
        updateFunctionCode: {
            success: `The code of function {name} is updated successfully.`,
            failed: `Failed to update the code of function {name}.`
        },
        updateFunctionConfig: {
            success: `The configuration of function {name} is updated successfully.`,
            failed: `Failed to update the configuration of function {name}.`
        },
    };

    constructor(
        public readonly client: FunctionGraphClient,
        public readonly props: any = {},
    ) {
        this.handlerInputs(props);
        log.verbose(`FunctionService props: ${JSON.stringify(props, null, 4)}`);
    }

    /**
   * 部署函数
   * 1. 判断当前函数是否存在
   * 2. 函数存在，执行更新
   * 3. 不存在，执行创建
   */
    async deploy() {
        try {
            if (
                (!this.props.agencyName || !this.props.xrole) &&
                (this.props.vpcId || this.props.subnetId)
            ) {
                throw new Error("First configure the function agency in s.yml.");
            }
            if (this.props.codeType === "obs" && !this.props.codeUrl) {
                throw new Error(
                    "First configure the OBS link URL for the function code package in s.yml."
                );
            }
            const isExist = await this.config();
            const response = isExist
                ? await this.update(this.metaData)
                : await this.create();
            return this.handleResponse(response.func_urn ? response : this.metaData);
        } catch (err) {
            throw err;
        }
    }

    /**
     * 删除函数
     * @returns 
     */
    async remove() {
        try {
            log.notice(`Start delete function ${this.functionInfo.func_name}.\n`);
            const request = new DeleteFunctionRequest().withFunctionUrn(this.getNoVersionUrn());
            const result = await this.client.deleteFunction(request);
            return this.handerResult(result, this.logMap.deleteFunction);
        } catch (err) {
            throw err;
        }
    }

    /**
     * 函数执行
     * @param event 
     */
    async invoke(event: string) {
        log.notice(`Start invoking function ${this.functionInfo.func_name}.\n`);
        const request = new InvokeFunctionRequest();
        request.withFunctionUrn(this.functionUrn);
        request.withXCffLogType("tail");
        request.withXCFFRequestVersion("v1");
        request.withBody(JSON.parse(event));
        const result = await this.client.invokeFunction(request);
        log.notice("========= FGS invoke Logs begin =========");
        log.notice(result.log);
        log.notice("========= FGS invoke Logs end =========\n");
        log.notice(`FGS Invoke Result[code: ${result.status}]`);
        log.notice(JSON.stringify(JSON.parse(result.result), null, 4));
    }

    /**
     * 函数信息
     * @param event 
     */
    async info() {
        const funcMsg = `- ${this.functionInfo.func_name}\n   runtime: ${this.functionInfo.runtime}\n   handler: ${this.functionInfo.handler}\n   Endpoints`;
        try {
            log.notice(`Start get function ${this.functionInfo.func_name}.\n`);
            const request = new ListFunctionTriggersRequest();
            request.withFunctionUrn(this.functionUrn);
            const result: any = await this.client.listFunctionTriggers(request);
            log.verbose(`result->` + JSON.stringify(result, null, 4));
            let apimsg = '';
            result.filter(t => ['DEDICATEDGATEWAY', 'APIG'].includes(t.trigger_type_code) && t.trigger_status === 'ACTIVE').forEach(t => {
                apimsg += `   - ${t.event_data.api_name}\n      ${t.event_data.req_method} ${t.event_data.invoke_url}`
            });
            return `${funcMsg} \n ${apimsg}`;
        } catch (err) {
            return `${funcMsg} \n     There are no endpoints yet.\n`;
        }

    }
    getUrn() {
        return this.functionUrn;
    }


    /**
     * 校验函数是否存在
     * @param props 
     * @returns 
     */
    private async config() {
        try {
            const request = new ShowFunctionConfigRequest().withFunctionUrn(this.functionUrn);
            this.metaData = await this.client.showFunctionConfig(request);
            return this.metaData.httpStatusCode >= 200 && this.metaData.httpStatusCode < 300;
        } catch (err) {
            return false;
        }
    }

    /**
     * 处理函数信息
     * @param props 
     */
    private async handlerInputs(props: any = {}) {
        const { region, projectId, version, name } = props;
        this.functionInfo = {
            func_name: name,
            handler: props.handler || 'index.handler',
            memory_size: props.memorySize || 256,
            timeout: props.timeout || 30,
            runtime: props.runtime || 'Node.js14.18',
            package: _.isString(props.package) ? props.package : 'default',
            code_type: 'zip',
            description: props.description || '',
            code: {
                codeUri: './src'
            },
            user_data: JSON.stringify(props.environment || {})
        };
        this.functionUrn = this.handlerUrn(region, projectId, this.functionInfo.package, name, version);
    }

    /**
     *  处理函数信息输出
     * @param response
     * @returns
     */
    private handleResponse(response: any) {
        const content = [
            { desc: "Function Name", example: `${response.func_name}` },
            { desc: "Function URN", example: `${response.func_urn}` },
            { desc: "Project name", example: `${response.project_name}` },
            { desc: "Runtime", example: `${response.runtime}` },
            { desc: "Handler", example: `${response.handler}` },
            { desc: "Code size", example: `${response.code_size}` },
            { desc: "Timeout", example: `${response.timeout}` },
            { desc: "Description", example: `${response.description || "No description"}` },
            { desc: "More", example: 'https://console.huaweicloud.com/functiongraph/#/serverless/dashboard' }
        ];

        return {
            res: [
                {
                    header: "Function",
                    content,
                },
            ],
            functionUrn: response.func_urn,
        };
    }

    /**
     * 封装URN
     * @param region 
     * @param projectId 
     * @param funPackage 
     * @param name 
     * @returns 
     */
    private handlerUrn(region, projectId, funPackage, name, version = 'latest') {
        return `urn:fss:${region}:${projectId}:function:${funPackage}:${name}:${version}`;
    }

    /**
     * 处理函数结果
     * FSS.0409 代码没有更新
     * @param result 处理结果
     * @param type 展示内容
     * @returns 
     */
    private handerResult(result: any = {}, type: { success: string; failed: string }) {
        const { httpStatusCode, errorMsg, errorCode } = result;
        if (httpStatusCode >= 200 && httpStatusCode < 300 || errorCode === "FSS.0409") {
            log.success(type.success.replace('{name}', this.functionInfo.func_name));
            return result;
        }
        log.error(`${type.failed.replace('{name}', this.functionInfo.func_name)} result = ${JSON.stringify(result)}`);
        throw new Error(JSON.stringify({ errorMsg, errorCode }));
    }

    private getNoVersionUrn() {
        const urns = this.functionUrn.split(':');
        urns.pop();
        return urns.join(':');
    }

    /**
   * 创建函数
   * @returns
   */
    private async create() {
        const body = new CreateFunctionRequestBody()
            .withFuncName(this.props.functionName)
            .withPackage(this.functionInfo.package)
            .withRuntime(
                (this.props.runtime as CreateFunctionRequestBodyRuntimeEnum) ||
                "Node.js14.18"
            )
            .withCodeType(
                (this.props.codeType ||
                    "zip") as CreateFunctionRequestBodyCodeTypeEnum
            )
            .withType(CreateFunctionRequestBodyTypeEnum.V2);

        this.setBasicConfig(body, this.props);
        this.setPermissionConfig(body, this.props);
        this.setNetConfig(body, this.props);
        this.setEnvConfig(body, this.props);
        this.setLogConfig(body, this.props);
        this.setAdvancedConfig(body, this.props);
        this.props.dependVersionList &&
            body.withDependVersionList(this.props.dependVersionList);

        if (this.props.codeType === "obs") {
            body.withCodeUrl(this.props.codeUrl);
        } else {
            const zipFile = await startZip(this.props.code?.codeUri ?? './src');
            body.withFuncCode(new FuncCode().withFile(zipFile));
        }
        log.verbose(`Creating function [${this.props.functionName}].`);
        log.verbose("------------create body-------------");
        log.verbose(JSON.stringify(body));
        try {
            const result: any = await this.client.createFunction(
                new CreateFunctionRequest().withBody(body)
            );
            handlerResponse(result);
            // 存在仅支持更新的属性时
            if (
                this.props.domainNames ||
                this.props.encryptedUserData ||
                this.props.enableDynamicMemory
            ) {
                this.updateConfig(result);
            }
            log.verbose(`Function [${this.props.functionName}] created.`);
            return result;
        } catch (error) {
            log.error(
                `Create function [${this.props.functionName}] failed. err=${(error as Error).message
                }`
            );
            throw error;
        }
    }

    /**
     * 更新函数
     * @returns
     */
    private async update(
        config: IFunctionResult
    ) {
        await this.updateCode(config);
        await this.updateConfig(config);
        return config;
    }

    /**
     * 更新函数代码
     * @returns
     */
    private async updateCode(
        config: IFunctionResult
    ) {
        log.verbose(
            `Updating the code of function [${this.props.name}].`
        );
        try {
            const body = new UpdateFunctionCodeRequestBody()
                .withCodeType(
                    (this.props
                        .codeType as UpdateFunctionCodeRequestBodyCodeTypeEnum) ??
                    config.code_type
                )
                .withDependVersionList(
                    this.props.dependVersionList ?? config.depend_version_list
                );
            if (this.props.codeType === "obs") {
                body.withCodeUrl(this.props.codeUrl);
            } else {
                const zipFile = await startZip(this.props.code?.codeUri ?? './src');
                log.verbose("File compression completed");
                body.withFuncCode(new FuncCode().withFile(zipFile));
            }

            const result: any = await this.client.updateFunctionCode(
                new UpdateFunctionCodeRequest()
                    .withBody(body)
                    .withFunctionUrn(config.func_urn)
            );
            handlerResponse(result);
            log.verbose(
                `Code of function [${this.props.functionName}] updated.`
            );
        } catch (error) {
            log.verbose(
                `error -> ${error.errorCode}`
            );
            if (error.errorCode === 'FSS.0409') {
                return;
            }
            log.error(
                `Update code of function [${this.props.functionName}] failed. err=${(error as Error).message
                }`
            );
            throw error;
        }
    }

    /**
     * 更新函数配置
     * @param props
     * @param client
     * @param config
     */
    private async updateConfig(
        config: IFunctionResult
    ) {
        log.notice(
            `Updating configurations of function [${this.props.functionName}].`
        );
        try {
            const body = this.getConfigRequestBody(this.props, config);
            log.verbose("------------update body-----------");
            log.verbose(JSON.stringify(body));
            const request = new UpdateFunctionConfigRequest()
                .withFunctionUrn(this.functionUrn)
                .withBody(body);
            const result: any = this.client.updateFunctionConfig(request);
            handlerResponse(result);
            log.verbose(
                `Configurations of function [${this.props.functionName}] updated.`
            );
        } catch (error) {
            log.error(
                `Update configurations of function [${this.props.functionName
                }] failed. err=${(error as Error).message}`
            );
            throw error;
        }
    }


    private isUpdate(
        body: RequestBody,
        config: unknown | undefined
    ): body is UpdateFunctionConfigRequestBody {
        return config !== undefined;
    }

    /**
     * 获取配置更新参数
     * @param functionInfo
     * @param config
     * @returns
     */
    private getConfigRequestBody(
        functionInfo: IFunctionConfig,
        config: IFunctionResult
    ) {
        const body = new UpdateFunctionConfigRequestBody();
        body
            .withFuncName(config.func_name)
            .withRuntime(
                config.runtime as UpdateFunctionConfigRequestBodyRuntimeEnum
            );
        this.setBasicConfig(body, functionInfo, config);
        this.setPermissionConfig(body, functionInfo, config);
        this.setNetConfig(body, functionInfo, config);
        this.setEnvConfig(body, functionInfo, config);
        this.setConcurrenyConfig(body, functionInfo, config);
        this.setLogConfig(body, functionInfo, config);
        this.setAdvancedConfig(body, functionInfo, config);
        return body;
    }

    /**
     * 基本配置
     * @param body
     * @param newData
     * @param oldData
     */
    private setBasicConfig(
        body: RequestBody,
        newData: BasicConfig,
        oldData?: IFunctionResult
    ) {
        // 企业项目用户必传
        body.withEnterpriseProjectId(
            newData?.enterpriseProjectId ?? oldData?.enterprise_project_id ?? "0"
        );
        body.withMemorySize(newData?.memorySize ?? oldData?.memory_size ?? 128);
        body.withTimeout(newData?.timeout ?? oldData?.timeout ?? 30);
        body.withHandler(newData?.handler ?? oldData?.handler ?? "index.handler");
        body.withDescription(newData?.description ?? oldData?.description);
    }

    /**
     * 权限（委托）配置
     * @param body
     * @param newData
     * @param oldData
     */
    private setPermissionConfig(
        body: RequestBody,
        newData: PermissionConfig,
        oldData?: IFunctionResult
    ) {
        body.withXrole(newData?.xrole ?? newData?.agencyName ?? oldData?.xrole);
        body.withAppXrole(newData?.appXrole ?? oldData?.app_xrole);
    }

    /**
     * 网络配置
     * @param body
     * @param newData
     * @param oldData
     */
    private setNetConfig(
        body: RequestBody,
        newData: NetConfig,
        oldData?: IFunctionResult
    ) {
        const vpcId =
            newData?.funcVpc?.vpcId ?? newData?.vpcId ?? oldData?.func_vpc?.vpc_id;
        const subnetId =
            newData?.funcVpc?.subnetId ??
            newData?.subnetId ??
            oldData?.func_vpc?.subnet_id;
        if (vpcId && subnetId) {
            const funcVpc = new FuncVpc();
            funcVpc.withVpcId(vpcId);
            funcVpc.withSubnetId(subnetId);
            funcVpc.withCidr(newData?.funcVpc?.cidr ?? oldData?.func_vpc?.cidr);
            funcVpc.withGateway(
                newData?.funcVpc?.gateway ?? oldData?.func_vpc?.gateway
            );
            body.withFuncVpc(funcVpc);
        }
        const networkController = new NetworkControlConfig();
        networkController.withDisablePublicNetwork(
            Boolean(
                newData?.networkController?.disablePublicNetwork ??
                oldData?.network_controller?.disable_public_network
            )
        );
        const vpcs = newData?.networkController?.triggerAccessVpcs?.map((v) => ({
            vpc_id: v.vpcId ?? v.vpc_id,
            vpc_name: v.vpcName ?? v.vpc_name,
        }));
        networkController.withTriggerAccessVpcs(
            vpcs ?? oldData?.network_controller?.trigger_access_vpcs
        );
        body.withNetworkController(networkController);
        if (this.isUpdate(body, oldData)) {
            const domainNames = newData?.domainNames?.map((v) => ({
                id: v.id,
                domain_name: v.name ?? v.domainName ?? v.domain_name,
            }));
            body.withDomainNames(
                domainNames ? JSON.stringify(domainNames) : oldData?.domain_names
            );
        }
    }

    /**
     * 环境变量，仅更新时支持传加密环境变量
     * @param body
     * @param newData
     * @param oldData
     * @returns
     */
    private setEnvConfig(body: RequestBody, newData: any, oldData?: any) {
        try {
            body.withUserData(
                JSON.stringify(newData?.userData ?? newData?.environment?.variables) ??
                oldData?.user_data ??
                "{}"
            );
            if (!this.isUpdate(body, oldData)) {
                return;
            }
            if (newData?.encryptedUserData) {
                body.withEncryptedUserData(JSON.stringify(newData.encryptedUserData));
            }
        } catch (error) {
            log.error(error);
        }
    }

    /**
     * 并发配置，仅支持更新
     * @param body
     * @param newData
     * @param oldData
     */
    private setConcurrenyConfig(
        body: UpdateFunctionConfigRequestBody,
        newData: ConcurrencyConfig,
        oldData?: IFunctionResult
    ) {
        const strategyConf = new StrategyConfig();
        strategyConf.withConcurrency(
            newData.concurreny ?? oldData?.strategy_config.concurrency
        );
        strategyConf.withConcurrentNum(
            newData.concurrentNum ?? oldData?.strategy_config.concurrent_num
        );
        body.withStrategyConfig(strategyConf);
    }

    /**
     * 日志配置，当前必传日志组id 日志流id 日志流名称
     * @param body
     * @param newData
     * @param oldData
     * @returns
     */
    private setLogConfig(
        body: RequestBody,
        newData: LogConfig,
        oldData?: IFunctionResult
    ) {
        if (
            !(newData?.ltsGroupId ?? oldData?.log_group_id) ||
            !(newData?.ltsStreamId ?? oldData?.log_stream_id) ||
            !newData?.ltsStreamName
        ) {
            return;
        }
        const conf = new FuncLogConfig();
        conf.withGroupId(newData?.ltsGroupId ?? oldData?.log_group_id);
        conf.withGroupName(newData?.ltsGroupName);
        conf.withStreamId(newData?.ltsStreamId ?? oldData?.log_stream_id);
        conf.withStreamName(newData?.ltsStreamName);
        body.withLogConfig(conf);
    }

    /**
     * 高级配置
     * @param body
     * @param newData
     * @param oldData
     */
    private setAdvancedConfig(
        body: RequestBody,
        newData: AdvancedConfig,
        oldData?: IFunctionResult
    ) {
        body.withInitializerHandler(
            newData?.initializerHandler ?? oldData?.initializer_handler
        );
        body.withInitializerTimeout(
            newData?.initializerTimeout ?? oldData?.initializer_timeout
        );
    }
}
