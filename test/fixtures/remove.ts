import { DeployPlugin } from '../../src/plugins/deploy';

(async () => {
    try {
        const serverless: any = {};
        const option: any = {};
        const data = await new DeployPlugin(serverless, option);
        console.log(data);
    } catch (error) {
        console.error(error);
    }
})();
