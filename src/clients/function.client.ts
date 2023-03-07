import { BasicCredentials } from "@huaweicloud/huaweicloud-sdk-core";
import { FunctionGraphClient } from "@huaweicloud/huaweicloud-sdk-functiongraph";
import { ICredentials, ServiceType } from "../models/interface";
import { getEndpoint } from "../utils/util";
import { ApigClient } from "./apig.client";

export class FunctionClient {

    private apigClient: ApigClient;

    private functionClient: FunctionGraphClient;

    private projectId: string;

    build(credentials: ICredentials, region = 'cn-north-4', projectId = '') {
        this.projectId = projectId;
        const basicCredentials = new BasicCredentials()
            .withAk(credentials.AccessKeyID)
            .withSk(credentials.SecretAccessKey)
            .withProjectId(projectId);
        this.functionClient = FunctionGraphClient.newBuilder()
            .withCredential(basicCredentials)
            .withEndpoint(getEndpoint(region, ServiceType.FUNCTIONGRAPH))
            .build();
        this.apigClient = ApigClient.newBuilder()
            .withCredential(basicCredentials)
            .withEndpoint(getEndpoint(region, ServiceType.APIG))
            .build();
        return this;
    }

    getProjectId() {
        return this.projectId;
    }

    getApigClient(): ApigClient {
        return this.apigClient;
    }

    getFunctionClient(): FunctionGraphClient {
        return this.functionClient;
    }
}
