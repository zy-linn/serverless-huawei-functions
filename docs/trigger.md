## trigger 字段

| 参数名    | 必填  | 类型   | 参数描述                                                                                                                                                                                                                   |
| --------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| triggerTypeCode    | True  | [Enum](#触发器类型) | 触发器类型 |
| status      | False  | Enum   | 触发器状态，取值为`ACTIVE(启用)`、`DISABLED(禁用)`，默认为 `ACTIVE` |   
| eventData    | True  | Struct | 触发器配置|

##### 触发器类型
- [TIMER](#timer-触发器)
- [APIG(APIG共享版)](#apig-触发器)
- [DEDICATEDGATEWAY(APIG专享版)](#apig-触发器)
- [OBS](#obs-触发器)
- [KAFKA](#kafka-触发器)
- [SMN](#smn-触发器)
- [LTS](#lts-触发器)
- [CTS](#cts-触发器)
- [DIS](#dis-触发器)

### TIMER 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| name      | False  | String  | 定时器名称 |
| scheduleType         | True  | Enum | 触发规则，取值为 `Rate`、[`Cron`](https://support.huaweicloud.com/usermanual-functiongraph/functiongraph_01_0908.html) ，默认为 `Rate`                              |
| schedule        | True | String  | 定时器规则内容                        |
| userEvent        | False | String  | 附加信息，如果用户配置了触发事件，会将该事件填写到TIMER事件源的“user_event”字段   |

参考案例：

```yaml
events:
  - triggerTypeCode: TIMER
    status: ACTIVE
    eventData:
        name: Timer-xxx
        scheduleType: Rate
        schedule: 3m
        userEvent: xxxx

events:
  - triggerTypeCode: TIMER
    status: ACTIVE
    eventData:
        name: Timer-xxx
        scheduleType: Cron
        schedule: 0 15 2 * * ?
        userEvent: xxxx
```

### APIG 触发器

| 参数名            | 必填 | 类型              | 参数描述                    |
| ----------------- | ---- | ----------------- | --------------------------------------------- |
| name              | False | String            | API名称，默认使用函数名             |
| instanceId              | False | String            | API实例ID，**专项版必填**             |
| envName           | False | String          | API的发布环境，默认为 `RELEASE`                    |
| envId           | False | String          | API的发布环境id，默认为 `DEFAULT_ENVIRONMENT_RELEASE_ID`                    |
| protocol           | False | Enum     | 请求协议，取值为`HTTP`、`HTTPS`， 默认为 `HTTPS`                    |
| groupId         | True | String           | 分组ID                   |
| slDomain           | False | String          | APIG系统默认分配的子域名 |
| reqMethod           | False | Enum | API的请求方式，取值为`GET`、`POST`、`PUT`、`DELETE`、`HEAD`、`PATCH`、`OPTIONS`、`ANY`，默认为`GET`|
| matchMode           | False | Enum          | 匹配方式，取值为`SWA(前缀匹配)`、`NORMAL(绝对匹配)`，默认为`SWA`|
| auth              | False | [Enum](#auth)           | 安全认证，默认为 `IAM`                    |
| path           | False | String          | APIG接口PATH路径，默认为函数名             |
| timeout           | False | Number           | 后端超时时间，单位为毫秒，取值范围为 1 ~ 60000。默认为 `5000`      |

###### auth
API认证方式：

- App： 采用Appkey&Appsecret认证，安全级别高，推荐使用，详情请[参见APP认证](https://support.huaweicloud.com/devg-apig/apig-dev-180907066.html)。
- IAM： IAM认证，只允许IAM用户能访问，安全级别中等，详情请[参见IAM认证](https://support.huaweicloud.com/devg-apig/apig-dev-180307020.html)。
- None： 无认证模式，所有用户均可访问。

##### reqMethod
- GET
- POST
- PUT
- DELETE
- HEAD
- PATCH
- OPTIONS
- ANY


参考案例：

```yaml
events:
  - triggerTypeCode: APIG
    status: ACTIVE
    eventData:
        name: APIG_test
        instanceId: instance_xxx
        envName: RELEASE
        envId: DEFAULT_ENVIRONMENT_RELEASE_ID
        protocol: HTTPS
        groupId: groupId
        slDomain: groupId.apig.region.huaweicloudapis.com
        reqMethod: GET
        matchMode: SWA
        auth: IAM
        path: apiPath
        timeout: 5000
```

### OBS 触发器

| 参数名            | 必填 | 类型              | 参数描述                    |
| ----------------- | ---- | ----------------- | --------------------------------------------- |
| bucket            | True | String            | 桶名称                                                     |
| events            | True | List\<String\>    | 事件列表， 相关文档：https://support.huaweicloud.com/obs_faq/obs_faq_0051.html    |
| name              | False | String           | 事件通知名称                    |
| prefix            | False | String           | 前缀，用来限制以此关键字开头的对象的事件通知                    |
| suffix            | False | String           | 后缀，用来限制以此关键字结尾的对象的事件通知                   |

参考案例：

```yaml
events:
  - triggerTypeCode: OBS
    status: ACTIVE
    eventData:
        bucket: obs-cff
        events:
            - s3:ObjectCreated:*
        name: obs-event-xxx
        prefix: xxxx
        suffix: xxxx
```

### KAFKA 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| batchSize      | False  | Number  | 批处理大小，值为1-1000，默认为 `100` |
| instanceId         | True  | String | 实例ID   |
| topicIds        | True | List\<String\>  | KAFKA主题id列表                        |
| kafkaUser        | False | String  | KAFKA账户名   |
| kafkaPassword        | False | String  | KAFKA账户密码   |

参考案例：

```yaml
events:
  - triggerTypeCode: KAFKA
    status: ACTIVE
    eventData:
        batchSize: 100
        instanceId: instance_xxx
        topicIds: 
            - topic1
            - topic2
        kafkaUser: xxxx
        kafkaPassword: xxxx
```

### SMN 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| topicUrn      | True  | String  | 主题URN |

参考案例：

```yaml
events:
  - triggerTypeCode: SMN
    status: ACTIVE
    eventData:
        topicUrn: xxx
```

### LTS 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| logGroupId      | True  | String  | 日志组ID |
| logTopicId      | True  | String  | 日志流ID |

参考案例：

```yaml
events:
  - triggerTypeCode: LTS
    status: ACTIVE
    eventData:
        logGroupId: xxx
        logTopicId: xxx
```

### CTS 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| name      | False  | String  | 触发器名称 |
| operations      | True  | List\<String\>  | 自定义操作，[参考](https://support.huaweicloud.com/usermanual-functiongraph/functiongraph_01_0130.html) |

参考案例：

```yaml
events:
  - triggerTypeCode: LTS
    status: ACTIVE
    eventData:
        name: cts_xxx
        operations: 
            - APIG:apigConfig;apigApps:updateConfig;updateApp
```

### DIS 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| streamName      | True  | String  | 通道名称 |
| sharditeratorType      | False  | [Enum](#sharditeratorType)  | 起始位置，默认为 `TRIM_HORIZON` |
| pollingInterval      | False  | Number  | 拉取周期，默认为 `30` |
| pollingUnit      | False  | String  | 拉取周期单位，取值为`s(秒)`、`ms(毫秒)`，默认为 `s` |
| isSerial      | False  | Boolean  | 串行处理数据，如果开启该选项，取一次数据处理完之后才会取下一次数据；否则只要拉取周期到了就会取数据进行处理，默认为 `true` |
| maxFetchBytes      | False  | Number  | 最大提取字节数，默认为 `1048576 (1MB)` |
| batchSize      | False  | Number  | 批处理大小，单次函数执行处理的最大数据量 |

##### sharditeratorType
- TRIM_HORIZON：从最早被存储至分区的有效记录开始读取。
- LATEST：从分区中的最新记录开始读取，此设置可以保证总是读到分区中最新记录

参考案例：

```yaml
events:
  - triggerTypeCode: LTS
    status: ACTIVE
    eventData:
        streamName: xxx
        sharditeratorType: TRIM_HORIZON
        pollingInterval: 30
        pollingUnit: s
        isSerial: true
        maxFetchBytes: 1048576
        batchSize: 111
```