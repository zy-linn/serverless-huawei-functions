import { ICredentials } from "../models/interface";

const core = require('@huaweicloud/huaweicloud-sdk-core');
const iam = require("@huaweicloud/huaweicloud-sdk-iam");

export class IamClient {
    private endpoint = 'https://iam.myhuaweicloud.com';
    private iamClient: any;

    build(credentials: ICredentials) {
        const globalCredentials = new core.GlobalCredentials().withAk(credentials.AccessKeyID)
            .withSk(credentials.SecretAccessKey);
        this.iamClient = iam.IamClient.newBuilder()
            .withCredential(globalCredentials)
            .withEndpoint(this.endpoint)
            .build();
        return this;
    }

    async getProject(region = 'cn-north-4') {
        const request = new iam.KeystoneListProjectsRequest().withName(region);
        try {
            const result = await this.iamClient.keystoneListProjects(request);
            const curProject = (result?.projects || []).find(pro => pro.name === region);
            return curProject?.id ?? null;
        } catch (err) {
            return null;
        }
    }
}
