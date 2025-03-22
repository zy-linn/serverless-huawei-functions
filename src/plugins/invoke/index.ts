import Serverless, { Options } from "serverless";
import { BasePlugin } from '../basePlugin';
import { Logger } from "serverless-fgs-sdk";

export class InvokePlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "invoke:invoke": this.invoke.bind(this),
        };
    }

    private async invoke() {
        try {
            const ins = await this.getIns();
            if (!this.singleFunction) {
                Logger.getIns().error(`Function is required. Please specify with --function functionName`);
                throw new Error('Function is required. Please specify with --function functionName');
            }
            if (ins.length === 0) {
                Logger.getIns().error(`Function[${this.singleFunction}] not found. Please check function and specify with  --function functionName`);
                throw new Error(`Function[${this.singleFunction}] not found. Please check function and specify with  --function functionName`);
            }
            const event = await this.getEvent();
            await ins[0].invoke(event);
        } catch (error) {
            Logger.getIns().error(`Invoke error. err=${(error as Error).message}`);
        }
    }
}
