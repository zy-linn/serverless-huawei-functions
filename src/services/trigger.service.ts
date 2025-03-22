import {
    CreateFunctionTriggerRequest,
    CreateFunctionTriggerRequestBody,
    CreateFunctionTriggerRequestBodyTriggerStatusEnum,
    DeleteFunctionTriggerRequest,
    ListFunctionTriggersRequest,
    UpdateriggerEventData,
    UpdateTriggerRequest,
    UpdateTriggerRequestBody,
} from "@huaweicloud/huaweicloud-sdk-functiongraph";
import { log } from '@serverless/utils/log';
import { IEventData, ILtsProps, IObsProps, ITimerProps, ITriggerProps, TypeCode } from "../models/interface";
import { humpToUnderline, isString, randomLenChar } from "../utils/util";
import { FunctionClient } from "../clients/function.client";

export class TriggerService {
    private triggerType: Trigger;
    private logMap = {
        create: {
            success: `Trigger[{name}] is created successfully.`,
            failed: `Failed to create trigger[{name}].`
        },
        delete: {
            success: `Trigger[{name}] is deleted successfully.`,
            failed: `Failed to delete trigger[{name}].`
        },
    };
    private triggerInsMap = {
        [TypeCode.APIG]: (client, props, functionUrn) => new ApigTrigger(client, props, functionUrn),
        [TypeCode.CTS]: (client, props, functionUrn) => new CtsTrigger(client, props, functionUrn),
        [TypeCode.DEDICATEDGATEWAY]: (client, props, functionUrn) => new DedicatedgatewayTrigger(client, props, functionUrn),
        [TypeCode.DIS]: (client, props, functionUrn) => new DisTrigger(client, props, functionUrn),
        [TypeCode.OBS]: (client, props, functionUrn) => new ObsTrigger(client, props, functionUrn),
        [TypeCode.TIMER]: (client, props, functionUrn) => new TimerTrigger(client, props, functionUrn),
        [TypeCode.LTS]: (client, props, functionUrn) => new LtsTrigger(client, props, functionUrn),
        [TypeCode.KAFKA]: (client, props, functionUrn) => new KafkaTrigger(client, props, functionUrn),
        [TypeCode.SMN]: (client, props, functionUrn) => new SmnTrigger(client, props, functionUrn),
    };

    private supportEdit = [TypeCode.TIMER, TypeCode.DDS, TypeCode.KAFKA, TypeCode.LTS, TypeCode.DIS];
    constructor(
        public readonly client: FunctionClient,
        public readonly props: any = {},
        public readonly functionUrn,
    ) {
        this.triggerType = this.triggerInsMap[this.props.triggerTypeCode?.toUpperCase()]?.(this.client, this.props, this.functionUrn);
    }

    /**
     * 部署触发器
     * 1. 判断触发器是否存在
     * 2. 如果存在且状态不一致，更新触发器状态，如果状态一致，触发器没有更新，直接返回结果
     * 3. 如果不存在，创建触发器
     * @returns 
     */
    async deploy() {
        if (!this.triggerType) {
            return;
        }
        log.notice(`Start deploy trigger[${this.triggerType.triggerType}].`);
        try {
            const trigger = await this.getTrigger();
            log.notice(JSON.stringify(trigger));
            if (trigger) {
                if (trigger.trigger_status !== this.triggerType.triggerStatus && this.supportEdit.includes(this.triggerType.triggerType)) {
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
        const triggerType = this.triggerType.triggerType;
        log.notice(`Start delete trigger[${triggerType}].`);
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
        log.verbose('create body->' + JSON.stringify(request));
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
        log.verbose('update body->' + JSON.stringify(request));
        const result = await this.client.getFunctionClient().updateTrigger(request);
        const response = this.handerResult(result, this.logMap.create);
        return this.handleResponse(response);
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
            const list = response.filter(res => res.trigger_type_code === this.triggerType.triggerType);
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
        const triggerType = this.triggerType.triggerType;
        if (httpStatusCode >= 200 && httpStatusCode < 300) {
            showLog && log.success(type?.success.replace('{name}', triggerType));
            return result;
        }
        showLog && log.error(type?.failed.replace('{name}', triggerType));
        throw new Error(JSON.stringify({ errorMsg, errorCode }));
    }
}

export class Trigger {
    protected triggerInfo: ITriggerProps;

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
    get triggerType() {
        return this.triggerInfo.triggerTypeCode;
    }

    /**
     * 获取触发器状态
     * @returns 
     */
    get triggerStatus() {
        return this.triggerInfo.status ?? 'ACTIVE';
    }

    get triggerName() {
        return this.triggerInfo.eventData.name;
    }

    /**
     * 封装创建触发器请求体
     * @returns 
     */
    async getCreateRequest(): Promise<CreateFunctionTriggerRequest> {
        const eventData = await this.getEventData();
        const body = new CreateFunctionTriggerRequestBody()
            .withEventData(eventData)
            .withTriggerStatus(this.triggerStatus)
            .withEventTypeCode(this.triggerType)
            .withTriggerTypeCode(this.triggerType);
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
            .withTriggerStatus(this.triggerStatus);
        return new UpdateTriggerRequest()
            .withFunctionUrn(this.functionUrn)
            .withTriggerId(triggerId)
            .withBody(body)
            .withTriggerTypeCode(this.triggerType);
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
            .withTriggerTypeCode(this.triggerInfo.triggerTypeCode);
    }

    /**
     * 判断触发器内容是否相等
     * @param trigger 
     * @returns 
     */
    async isEqual(trigger: IEventData): Promise<boolean> {
        return Promise.resolve(!!trigger);
    }

    /**
     * 获取触发器数据
     * @returns 
     */
    protected async getEventData(): Promise<any> {
        return Promise.resolve(this.triggerInfo.eventData);
    };

    /**
     * 获取参数信息，默认配置参数支持小驼峰和下划线两种格式
     * @param eventData 配置的数据
     * @param key 参数属性值
     * @returns 值
     */
    protected getEventValue(eventData: IEventData = {}, key = ''): any {
        const ulkey = humpToUnderline(key);
        return eventData[key] ?? eventData[ulkey];
    }

    /**
     * 处理数据
     * @param props 
     */
    private handlerInputs(props: any) {
        this.triggerInfo = {
            triggerId: props.triggerId,
            triggerTypeCode: props.triggerTypeCode,
            status: props.status as CreateFunctionTriggerRequestBodyTriggerStatusEnum,
            eventTypeCode: props.eventTypeCode,
            eventData: props.eventData || {}
        };
    }
}

/**
 * APIG 触发器
 */
export class ApigTrigger extends Trigger {
    /**
    * 获取触发器状态
    * @returns 
    */
    get triggerStatus() {
        return 'ACTIVE';
    }

    /**
     * 获取APIG触发器的EventData
     * 1. 先获取API分组
     * 2. 如果分组存在，默认取第一个分组
     * 3. 如果不存在，先创建一个分组
     * @returns 
     */
    protected async getEventData(): Promise<IEventData> {
        const eventData: IEventData = this.triggerInfo.eventData;
        const functionName = this.functionUrn.split(":")[6];
        return {
            name: eventData.name,
            env_name: this.getEventValue(eventData, 'envName') ?? 'DEFAULT_ENVIRONMENT_RELEASE_ID',
            env_id: this.getEventValue(eventData, 'envId') ?? 'RELEASE',
            protocol: eventData.protocol?.toUpperCase() ?? 'HTTPS',
            group_id: this.getEventValue(eventData, 'groupId'),
            sl_domain: this.getEventValue(eventData, 'slDomain'),
            match_mode: this.getEventValue(eventData, 'matchMode')?.toUpperCase() ?? 'SWA',
            req_method: this.getEventValue(eventData, 'reqMethod')?.toUpperCase() ?? 'GET',
            auth: eventData.auth?.toUpperCase() ?? 'IAM',
            backend_type: 'FUNCTION',
            instance_id: this.getEventValue(eventData, 'instanceId'),
            type: 1,
            path: `/${functionName}`,
            function_info: {
                timeout: eventData.timeout ?? 5000
            },
        };
    };

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData = await this.getEventData();
        return trigger && eventData.name === trigger.name
            && eventData.group_id === trigger.group_id
            && eventData.env_id === trigger.env_id;
    }
}

/**
 * DEDICATEDGATEWAY 触发器
 */
export class DedicatedgatewayTrigger extends ApigTrigger {

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: IEventData = await this.getEventData();
        return trigger && eventData.name === trigger.name
            && eventData.instance_id === trigger.instance_id
            && eventData.path === trigger.path
            && eventData.group_id === trigger.group_id
            && eventData.env_id === trigger.env_id;
    }
}

/**
 * OBS 触发器
 */
export class ObsTrigger extends Trigger {
    get triggerName() {
        const eventData: IObsProps = this.triggerInfo.eventData;
        return eventData.bucket;
    }

    /**
    * 获取触发器状态
    * @returns 
    */
    get triggerStatus() {
        return 'ACTIVE';
    }

    async getEventData(): Promise<IEventData> {
        const eventData: IObsProps = this.triggerInfo.eventData;
        return {
            bucket: eventData.bucket,
            events: eventData.events,
            name: eventData.name ?? `obs-event-${randomLenChar(6)}`,
            prefix: eventData.prefix ?? null,
            suffix: eventData.suffix ?? null
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: IObsProps = this.triggerInfo.eventData;
        return trigger && eventData.bucket === trigger.bucket
            && this.checkEvents(trigger.events, eventData.events);
    }

    private checkEvents(orgEvents = [], newEvents = []) {
        return this.checkEventByKey(orgEvents, newEvents)
            || this.checkEventByKey(orgEvents, newEvents, 's3:ObjectRemoved');
    }

    private checkEventByKey(orgEvents = [], newEvents = [], key = 's3:ObjectCreated') {
        if ((orgEvents.includes(`${key}:*`) && newEvents.find(e => e.startsWith(key)))
            || (newEvents.includes(`${key}:*`) && orgEvents.find(e => e.startsWith(key)))
        ) {
            return true;
        }
        return !!orgEvents.find(o => newEvents.includes(o));
    }
}

/**
 * CTS 触发器
 */
export class CtsTrigger extends Trigger {

    async getEventData(): Promise<IEventData> {
        const eventData: ITimerProps = this.triggerInfo.eventData;
        return {
            name: eventData.name ?? `cts-${randomLenChar(6)}`,
            operations: eventData.operations
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: ITimerProps = this.triggerInfo.eventData;
        return eventData.name === trigger?.name
            && eventData.schedule === trigger?.schedule
            && this.handlerOpers(trigger.operations, eventData.operations)
    }

    private handlerOpers(triggerOpers = [], configOpers = []) {
        const cOpers = configOpers.reduce((prev, next) => {
            const [type, ...list] = next.split(':');
            prev[type] = list.map(l => l.split(';'));
            return prev;
        }, {})
        const tOpers = triggerOpers.map(t => t.split(':'));
        return tOpers.find(t => {
            const list = cOpers[t[0]];
            let f = list?.length > 0;
            list?.forEach((l, i) => f = f && !!l.find(ll => t[i + 1].includes(ll)));
            return f;
        });
    }
}

/**
 * Dis 触发器
 */
export class DisTrigger extends Trigger {

    /**
    * 封装更新触发器的请求体
    * @param triggerId 触发器ID
    * @returns 
    */
    getUpdateRequest(triggerId = ''): UpdateTriggerRequest {
        const triggerInfo: IEventData = this.triggerInfo.eventData;
        const eventData = new UpdateriggerEventData()
            .withPollingUnit(this.getEventValue(triggerInfo, 'pollingUnit') ?? 's')
            .withPollingInterval(this.getEventValue(triggerInfo, 'pollingInterval') ?? 30)
            .withMaxFetchBytes(this.getEventValue(triggerInfo, 'maxFetchBytes'))
            .withIsSerial(this.getEventValue(triggerInfo, 'isSerial') ?? false)
        const body = new UpdateTriggerRequestBody()
            .withTriggerStatus(this.triggerStatus);
        return new UpdateTriggerRequest()
            .withFunctionUrn(this.functionUrn)
            .withTriggerId(triggerId)
            .withBody(body)
            .withTriggerTypeCode(this.triggerType);
    }

    async getEventData(): Promise<IEventData> {
        const eventData: IEventData = this.triggerInfo.eventData;
        return {
            stream_name: this.getEventValue(eventData, 'streamName'),
            sharditerator_type: this.getEventValue(eventData, 'sharditeratorType'),
            polling_interval: this.getEventValue(eventData, 'pollingInterval') ?? 30,
            polling_unit: this.getEventValue(eventData, 'pollingUnit') ?? 's',
            is_serial: this.getEventValue(eventData, 'isSerial'),
            max_fetch_bytes: this.getEventValue(eventData, 'maxFetchBytes'),
            batch_size: this.getEventValue(eventData, 'batchSize'),
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: IEventData = await this.getEventData();
        return eventData.stream_name === trigger?.stream_name
            && eventData.sharditerator_type === trigger?.sharditerator_type
    }
}

/**
 * TIMER 触发器
 */
export class TimerTrigger extends Trigger {

    async getEventData(): Promise<IEventData> {
        const eventData: ITimerProps = this.triggerInfo.eventData;
        return {
            name: eventData.name ?? `Timer-${randomLenChar(6)}`,
            schedule: eventData.schedule ?? '3m',
            schedule_type: this.getEventValue(eventData, 'scheduleType') ?? 'Rate',
            user_event: this.getEventValue(eventData, 'userEvent')
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: ITimerProps = this.triggerInfo.eventData;
        return eventData.name === trigger?.name
            && eventData.schedule === trigger?.schedule
            && this.getEventValue(eventData, 'scheduleType') === trigger?.schedule_type;
    }
}

/**
 * LTS 触发器
 */
export class LtsTrigger extends Trigger {

    async getEventData(): Promise<IEventData> {
        const eventData: ILtsProps = this.triggerInfo.eventData;
        return {
            log_group_id: this.getEventValue(eventData, 'logGroupId'),
            log_topic_id: this.getEventValue(eventData, 'logTopicId')
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: ILtsProps = this.triggerInfo.eventData;
        return this.getEventValue(eventData, 'logGroupId') === trigger?.log_group_id
            && this.getEventValue(eventData, 'logTopicId') === trigger?.log_topic_id
    }
}


/**
 * KAFKA 触发器
 */
export class KafkaTrigger extends Trigger {

    async getEventData(): Promise<IEventData> {
        const eventData: IEventData = this.triggerInfo.eventData;
        return {
            batch_size: this.getEventValue(eventData, 'batchSize') || 100,
            instance_id: this.getEventValue(eventData, 'instanceId'),
            topic_ids: this.getEventValue(eventData, 'topicIds'),
            kafka_user: this.getEventValue(eventData, 'kafkaUser'),
            kafka_password: this.getEventValue(eventData, 'kafkaPassword'),
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: IEventData = this.triggerInfo.eventData;
        return this.getEventValue(eventData, 'instanceId') === trigger?.instance_id
            && this.checkTopics(eventData, trigger?.topic_ids);
    }

    private checkTopics(eventData, topicIds) {
        const ids = this.getEventValue(eventData, 'topicIds') ?? [];
        return !!topicIds.find(id => ids.includes(id));
    }
}

/**
 * SMN 触发器
 */
export class SmnTrigger extends Trigger {

    async getEventData(): Promise<IEventData> {
        const eventData: ILtsProps = this.triggerInfo.eventData;
        return {
            topic_urn: this.getEventValue(eventData, 'topicUrn')
        };
    }

    async isEqual(trigger: IEventData): Promise<boolean> {
        const eventData: IEventData = this.triggerInfo.eventData;
        return this.getEventValue(eventData, 'topicUrn') === trigger?.topic_urn;
    }
}