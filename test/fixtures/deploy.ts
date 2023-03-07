import { DeployPlugin } from '../../src/plugins/deploy';
import { MockFactory } from '../MockFactory';
import HuaweiIndex from '../../src/index';
(async () => {
    try {
        const serverless: any = MockFactory.createTestServerless({
            configuration: { },
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
