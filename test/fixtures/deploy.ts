import { DeployPlugin } from '../../src/plugins/deploy';
import { MockFactory } from '../MockFactory';
import HuaweiIndex from '../../src/index';
(async () => {
    try {
        const serverless: any = MockFactory.createTestServerless({
            configuration: { 
            service: "fg-nodejs",
                frameworkVersion: "3",
                provider: {
                    name: "huawei",
                    runtime: "Node.js14.18",
                    region: 'cn-north-4',
                    memorySize: 256,
                    timeout: 10,
                    credentials: "~\\.fg\\credentials",
                },
                plugins: [
                    "serverless-aliyun-function-compute",
                ],
                functions: {
                    hello: {
                        handler: "index.handler",
                        description: "Tencent Serverless Cloud Function",
                        memorySize: 256,
                        timeout: 10,
                        environment: {
                            variables: {
                                ENV_FIRST: "env1",
                                ENV_Third: "env2",
                            },
                        },
                    },
                    world: {
                        handler: "index.handler1",
                    },
                },
            },
            serviceDir: "",
            configurationFilename: "serverless.yml",
            commands: [
                "deploy",
            ],
            options: {},
            variablesMeta: new Map()
        });
        const option: any = MockFactory.createTestServerlessOptions();
        await serverless.init();
        new HuaweiIndex(serverless, option);
        const data = await new DeployPlugin(serverless, option).hooks['deploy:deploy']();
        console.log(data);
    } catch (error) {
        console.error(error);
    }
})();
