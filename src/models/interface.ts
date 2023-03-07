import { CreateFunctionTriggerRequestBodyTriggerStatusEnum } from "@huaweicloud/huaweicloud-sdk-functiongraph";
import { FunctionClient } from "../clients/function.client";

export enum ServiceType {
    APIG = 'apig',
    IAM = 'iam',
    FUNCTIONGRAPH = 'functiongraph'
}

export enum MethodType {
    DEPLOY,
    REMOVE
}

export enum CommandType {
    ALL = 'all',
    FUNCTION = 'function',
    TRIGGER = 'trigger'
}

export interface ICredentials {
    AccountID?: string;
    AccessKeyID?: string;
    AccessKeySecret?: string;
    SecurityToken?: string;
    SecretID?: string;
    SecretKey?: string;
    SecretAccessKey?: string;
    KeyVaultName?: string;
    TenantID?: string;
    ClientID?: string;
    ClientSecret?: string;
    PrivateKeyData?: string
}

export interface IInputs {
    projectId?: string;
    credentials?: ICredentials;
    subCommand?: CommandType;
    props?: { [prop: string]: any };
    client?: FunctionClient;
    args?: string;
    isHelp?: boolean
}

export interface IFunctionProps {
    func_name: string; // 函数名称
    func_urn?: string;
    package: string; // 函数所属的分组Package
    runtime: string; // 运行时
    timeout: number; // 函数执行超时时间
    handler: string; // 函数执行入口
    memory_size: number; // 函数消耗的内存
    code_type?: string; // 函数代码类型
    code_filename?: string; // 函数的文件名
    func_code?: IFuncCode; // FuncCode结构返回体。
    description?: string; // 函数描述
    initializer_handler?: string; // 函数初始化入口
    initializer_timeout?: number; // 初始化超时时间
    enterprise_project_id?: string; // 企业项目ID
    type?: string; // 函数版本
    user_data?: string; // 用户自定义的name/value信息
    encrypted_user_data?: string; // 用户自定义的name/value信息，用于需要加密的配置。
    app_xrole?: string; // 函数使用的权限委托名称
    xrole?: string; // 函数使用的权限委托名称
    depend_version_list?: Array<string>; // 依赖版本id列表
    code?: {
        codeUri: string;
    },
}

export interface IFuncCode {
    file: string;
    link: string;
}

export interface ITrigger {
    trigger_id?: string;
    trigger_type_code: string; // 触发器类型。
    trigger_status?: CreateFunctionTriggerRequestBodyTriggerStatusEnum; // 触发器状态，取值为ACTIVE,DISABLED。
    event_type_code?: string; // 消息代码。
    event_data: IEventData; // 事件结构体。
}

export interface IEventData {
    [key: string]: string
}
