import Serverless, { Options } from "serverless";
import { BasePlugin } from '../basePlugin';
import { Logger } from "serverless-fgs-sdk";
export class DeployPlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "deploy:deploy": this.deploy.bind(this),
        };
    }

    private async deploy() {
        try {
            const ins = await this.getIns();
            for (let i = 0; i < ins.length; i++) {
                await ins[i].deploy();
            }
        } catch (error) {
            Logger.getIns().error(`Deployed error. err = ${error}`);
        }
    }
}
