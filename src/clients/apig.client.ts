import { ClientBuilder } from "@huaweicloud/huaweicloud-sdk-core/ClientBuilder";
import { HcClient } from "@huaweicloud/huaweicloud-sdk-core/HcClient";
import { randomLenChar } from "../utils/util";

function newClient(client: HcClient): ApigClient {
    return new ApigClient(client);
}

export class ApigClient {
    public static newBuilder(): ClientBuilder<ApigClient> {
        return new ClientBuilder<ApigClient>(newClient);
    }

    private hcClient: HcClient;
    public constructor(client: HcClient) {
        this.hcClient = client;
    }

    public getPath() {
        return __dirname;
    }

    /**
    * 创建创建API分组
    * 
    * Please refer to HUAWEI cloud API Explorer for details.
    *
    * @summary 创建函数版本别名
    * @param {string} functionUrn 函数的URN。
    * @param {CreateVersionAliasRequestBody} createVersionAliasRequestBody 创建函数请求body体。
    * @param {*} [options] Override http request option.
    * @throws {RequiredError}
    */
    public createApiGroup(): Promise<any> {
        const name = `API_Group_${randomLenChar(6)}`;
        const options = ParamCreater().createApiGroup(name, 'Serverless Devs');

        // @ts-ignore
        options['responseHeaders'] = [''];

        return this.sendRequest(options);
    }

    /**
     * 查询分组列表
     * @returns 
     */
    public listApiGroups(): Promise<any> {
        const options = ParamCreater().listApiGroups();
        // @ts-ignore
        options['responseHeaders'] = [''];
        return this.sendRequest(options);
    }

    /**
     * 请求处理
     * @param options 
     * @returns 
     */
    private sendRequest(options) {
        return new Promise((res, rej) => {
            this.hcClient.sendRequest(options).then(result => {
                const { httpStatusCode, errorMsg } = result;
                if (httpStatusCode >= 200 && httpStatusCode < 300) {
                    res(result);
                } else {
                    rej({ status: httpStatusCode, message: errorMsg });
                }
            }).catch(err => {
                rej(err);
            })
        });
    }
}

export const ParamCreater = function () {
    return {

        /**
         * 创建API分组
         * 
         * Please refer to HUAWEI cloud API Explorer for details.
         */
        createApiGroup(name = '', remark = '') {
            return {
                method: "POST",
                url: "/v1.0/apigw/api-groups",
                contentType: "application/json",
                queryParams: {},
                pathParams: {},
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    name,
                    remark
                }
            };
        },

        /**
         * 查询分组列表
         * @returns 
         */
        listApiGroups() {
            return {
                method: "GET",
                url: "/v1.0/apigw/api-groups",
                contentType: "application/json",
                queryParams: {},
                pathParams: {},
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {}
            };
        }
    }
}

/**
 *
 * @export
 * @class RequiredError
 * @extends {Error}
 */
export class RequiredError extends Error {
    name: "RequiredError" = "RequiredError";
    constructor(public field: string, msg?: string) {
        super(msg);
    }
}
