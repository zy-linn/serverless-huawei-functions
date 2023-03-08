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
        log.notice('Start deploy functions.');
        try {
            const ins = await this.getIns();
            for (let i = 0; i < ins.length; i++) {
                await ins[i].deploy();
            }
            log.success('Deployed success.');
        } catch (error) {
            log.error('Deployed error.');
        }
    }
}
