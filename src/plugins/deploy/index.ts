import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { BasePlugin } from '../basePlugin';
export class DeployPlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "deploy:deploy": this.deploy.bind(this),
        };
    }

    private async deploy() {
        try {
            if (this.options.function) {
                const ins = await this.getFgIns();
                await ins.deploy();
            } else {
                const ins = await this.getIns();
                for (let i = 0; i < ins.length; i++) {
                    await ins[i].deploy();
                }
            }
        } catch (error) {
            log.error('Deployed error.');
        }
    }
}
