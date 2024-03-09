import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { BasePlugin } from '../basePlugin';
export class InvokePlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "invoke:invoke": this.invoke.bind(this),
        };
    }

    private async invoke() {
        try {
            if (!this.options.function) {
                log.error(`Function is required. Please specify with --function`);
                throw new Error('Function is required. Please specify with --function');
            }
            const ins = await this.getFgIns();
            const event = await this.getEvent();
            await ins.invoke(event);
        } catch (error) {
            log.error('Invoke error.');
        }
    }
}
