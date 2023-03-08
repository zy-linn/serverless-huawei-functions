import {
    CreateFunctionTriggerRequest,
    CreateFunctionTriggerRequestBody,
    CreateFunctionTriggerRequestBodyTriggerStatusEnum,
    CreateFunctionTriggerRequestBodyTriggerTypeCodeEnum,
    DeleteFunctionTriggerRequest,
    DeleteFunctionTriggerRequestTriggerTypeCodeEnum,
    ListFunctionTriggersRequest,
    UpdateTriggerRequest,
    UpdateTriggerRequestBody,
    UpdateTriggerRequestTriggerTypeCodeEnum,
} from "@huaweicloud/huaweicloud-sdk-functiongraph";
import {log} from '@serverless/utils/log';
import { IEventData, ITrigger } from "../models/interface";
import { isString, randomLenChar } from "../utils/util";
import { ApigClient } from "../clients/apig.client";
import { FunctionClient } from "../clients/function.client";

export class TriggerService {
    private triggerType: Trigger;
    private logMap = {
        create: {
            success: `Trigger {name} is created successfully.`,
            failed: `Failed to create {name} trigger.`
        },
        delete: {
            success: `Trigger is deleted successfully.`,
            failed: `Failed to delete {name} trigger.`
        },
    };
    constructor(
        public readonly client: FunctionClient,
        public readonly props: any = {},
        public readonly functionUrn,
        public readonly spin: any
    ) {
        this.triggerType = this.getType();
    }

    /**
     * 部署触发器
     * 1. 判断触发器是否存在
     * 2. 如果存在且状态不一致，更新触发器状态，如果状态一致，触发器没有更新，直接返回结果
     * 3. 如果不存在，创建触发器
     * @returns 
     */
    async deploy() {
        log.notice(`Start deploy ${this.triggerType.getType()} trigger.`);
        try {
            const trigger = await this.getTrigger();
            if (trigger) {
                if (trigger.trigger_status !== this.triggerType.getStatus()) {
                    return this.update(trigger.trigger_id);
                }
                return this.handleResponse(trigger);
            } else {
                return this.create();
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * 删除触发器
     * 1. 先判断触发器是否存在
     * 2. 不存在，直接抛出异常
     * 3. 存在的话，删除触发器
     * @returns 
     */
    async remove() {
        const triggerType = this.triggerType.getType();
        log.notice(`Start delete ${triggerType} trigger.`);
        try {
            const trigger = await this.getTrigger();
            if (!trigger) { // 触发器
                const msg = `${this.logMap.delete.failed.replace('{name}', triggerType)} The trigger does not exist.`;
                throw new Error(msg);
            }
            const request = this.triggerType.getDeleteRequest(trigger.trigger_id);
            const result = await this.client.getFunctionClient().deleteFunctionTrigger(request);
            return this.handerResult(result, this.logMap.delete);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 创建触发器
     * @returns 
     */
    private async create() {
        const request = await this.triggerType.getCreateRequest();
        const result = await this.client.getFunctionClient().createFunctionTrigger(request);
        const response = this.handerResult(result, this.logMap.create);
        return this.handleResponse(response);
    }

    /**
     * 更新触发器
     * @param triggerId 
     * @returns 
     */
    private async update(triggerId = '') {
        const request = this.triggerType.getUpdateRequest(triggerId);
        const result = await this.client.getFunctionClient().updateTrigger(request);
        const response = this.handerResult(result, this.logMap.delete);
        return this.handleResponse(response);
    }

    /**
     * 获取当前触发器实例
     * @returns 
     */
    private getType(): Trigger {
        let type: Trigger;
        const codeType = this.props.trigger.triggerTypeCode as CreateFunctionTriggerRequestBodyTriggerTypeCodeEnum;
        switch (codeType) {
            case CreateFunctionTriggerRequestBodyTriggerTypeCodeEnum.APIG:
                type = new ApigTrigger(this.client, this.props.trigger, this.functionUrn);
                break;
            default:
                type = new Trigger(this.client, this.props.trigger, this.functionUrn);
                break;
        }
        return type;
    }

    /**
     * 校验触发器是否存在
     * 1. 获取本地存储的触发器ID
     * 2. 获取当前函数的触发器列表
     * 3. 触发器ID存在，通过ID获取对应的触发器
     * 4. 触发器ID不存在，通过EventData的内容判断触发器是否存在
     * @returns 
     */
    private async getTrigger() {
        try {
            const request = new ListFunctionTriggersRequest().withFunctionUrn(this.functionUrn);
            const result = await this.client.getFunctionClient().listFunctionTriggers(request);
            const response = this.handerResult(result, null, false);
            const list = response.filter(res => res.trigger_type_code === this.triggerType.getType());
            for (let i = 0; i < list.length; i++) {
                const isEqual = await this.triggerType.isEqual(list[i].event_data);
                if (isEqual) {
                    return list[i];
                }
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    /**
     *  处理函数信息输出
     * @param response
     * @returns
     */
    private handleResponse(response: any) {
        const triggerInfo = [
            {
                desc: "TriggerId",
                example: response.trigger_id,
            },
            {
                desc: "TriggerTypeCode",
                example: response.trigger_type_code,
            },
            {
                desc: "TriggerStatus",
                example: response.trigger_status,
            },
        ];
        const eventDataInfo = Object.keys(response.event_data || {}).map(key => {
            return {
                desc: key,
                example: response.event_data[key]
            }
        }).filter(key => isString(key.example));

        return [
            {
                header: "Trigger",
                content: triggerInfo,
            },
            {
                header: "Trigger event data",
                content: eventDataInfo,
            },
        ];
    }

    /**
     * 处理函数结果
     * @param result 处理结果
     * @param type 日志信息
     * @param showLog 展示日志
     * @returns 
     */
    private handerResult(result: any = {}, type: { success: string; failed: string }, showLog = true) {
        const { httpStatusCode, errorMsg, errorCode } = result;
        const triggerType = this.triggerType.getType();
        if (httpStatusCode >= 200 && httpStatusCode < 300) {
            showLog && log.success(type?.success.replace('{name}', triggerType));
            return result;
        }
        showLog && log.error(type?.failed.replace('{name}', triggerType));
        throw new Error(JSON.stringify({ errorMsg, errorCode }));
    }
}

export class Trigger {
    protected triggerInfo: ITrigger;

    constructor(
        public readonly client: FunctionClient,
        public readonly props: any = {},
        public readonly functionUrn = ''
    ) {
        this.handlerInputs(props);
    }

    /**
     * 获取触发器类型
     * @returns 
     */
    getType() {
        return this.triggerInfo.trigger_type_code;
    }

    /**
     * 获取触发器状态
     * @returns 
     */
    getStatus() {
        return this.triggerInfo.trigger_status;
    }

    /**
     * 封装创建触发器请求体
     * @returns 
     */
    async getCreateRequest(): Promise<CreateFunctionTriggerRequest> {
        const eventData = await this.getEventData();
        const body = new CreateFunctionTriggerRequestBody()
            .withEventData(eventData)
            .withTriggerStatus(this.triggerInfo.trigger_status)
            .withEventTypeCode(this.triggerInfo.event_type_code)
            .withTriggerTypeCode(this.triggerInfo.trigger_type_code as CreateFunctionTriggerRequestBodyTriggerTypeCodeEnum);
        return new CreateFunctionTriggerRequest()
            .withBody(body)
            .withFunctionUrn(this.functionUrn);
    }

    /**
     * 封装更新触发器的请求体
     * @param triggerId 触发器ID
     * @returns 
     */
    getUpdateRequest(triggerId = ''): UpdateTriggerRequest {
        const body = new UpdateTriggerRequestBody()
            .withTriggerStatus(this.props.trigger.status);
        return new UpdateTriggerRequest()
            .withFunctionUrn(this.functionUrn)
            .withTriggerId(triggerId)
            .withBody(body)
            .withTriggerTypeCode(this.triggerInfo.trigger_type_code as UpdateTriggerRequestTriggerTypeCodeEnum);
    }

    /**
     *  封装删除触发器的请求体
     * @param triggerId 触发器ID
     * @returns 
     */
    getDeleteRequest(triggerId = ''): DeleteFunctionTriggerRequest {
        return new DeleteFunctionTriggerRequest()
            .withFunctionUrn(this.functionUrn)
            .withTriggerId(triggerId)
            .withTriggerTypeCode(this.triggerInfo.trigger_type_code as DeleteFunctionTriggerRequestTriggerTypeCodeEnum);
    }

    /**
     * 判断触发器内容是否相等
     * @param trigger 
     * @returns 
     */
    async isEqual(trigger: IEventData): Promise<boolean> {
        return Promise.resolve(false);
    }

    /**
     * 获取触发器数据
     * @returns 
     */
    protected async getEventData(): Promise<IEventData> {
        return Promise.resolve(this.triggerInfo.event_data);
    };

    /**
     * 处理数据
     * @param props 
     */
    private handlerInputs(props: any) {
        this.triggerInfo = {
            trigger_id: props.triggerId,
            trigger_type_code: props.triggerTypeCode,
            trigger_status: props.status as CreateFunctionTriggerRequestBodyTriggerStatusEnum,
            event_type_code: props.eventTypeCode,
            event_data: props.eventData || {}
        };
    }
}

/**
 * APIG 触发器
 */
export class ApigTrigger extends Trigger {
    private apigClient: ApigClient;
    private eventData: IEventData;
    constructor(
        public readonly client: FunctionClient,
        public props: any = {},
        public readonly functionUrn = ''
    ) {
        super(client, props, functionUrn);
        this.apigClient = this.client.getApigClient();
    }

    /**
     * 获取APIG触发器的EventData
     * 1. 先获取API分组
     * 2. 如果分组存在，默认取第一个分组
     * 3. 如果不存在，先创建一个分组
     * @returns 
     */
    protected async getEventData(): Promise<IEventData> {
        if (this.eventData) {
            return this.eventData;
        }
        try {
            const { groups } = await this.apigClient.listApiGroups();
            const group = groups?.length > 0 ? groups[0] : await this.apigClient.createApiGroup();
            const name = `APIG_${randomLenChar(6)}`;
            this.eventData = {
                ...this.triggerInfo.event_data,
                group_id: group.id,
                sl_domain: group.sl_domain,
                name: this.triggerInfo.event_data.name?.replace(/-/g, '_') ?? name,
                path: this.triggerInfo.event_data.path?.replace(/-/g, '_') ?? `/${name}`
            }
            return this.eventData;
        } catch (err) {
            return this.triggerInfo.event_data;
        }
    };

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData = await this.getEventData();
        return trigger && eventData.name === trigger.name
            && eventData.auth === trigger.auth
            && eventData.path === trigger.path
            && eventData.protocol === trigger.protocol
            && eventData.group_id === trigger.group_id
            && eventData.env_id === trigger.env_id;
    }
}
