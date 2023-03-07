import Serverless from "serverless";

export class MockFactory {
    public static createTestServerless(config: any): Serverless {
        const sls = new Serverless(config);
        sls.pluginManager.loadAllPlugins = () => { };
        return sls;
    }

    public static createTestServerlessOptions(options?: any): Serverless.Options {
        return {
            extraServicePath: null,
            function: null,
            noDeploy: null,
            region: null,
            stage: null,
            watch: null,
            ...options
        };
    }
}
