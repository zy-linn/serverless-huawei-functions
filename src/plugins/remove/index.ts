import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { BasePlugin } from '../basePlugin';

export class RemovePlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "remove:remove": this.remove.bind(this),
        };
    }

    private async remove() {
        try {
            const ins = await this.getIns();
            for (let i = 0; i < ins.length; i++) {
                await ins[i].remove();
            }
        } catch(err) {
            log.error(`Remove error. err=${(err as Error).message}`);
        }
    }
}
