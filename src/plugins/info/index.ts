import Serverless, { Options } from "serverless";
import {log} from '@serverless/utils/log';
import { BasePlugin } from '../basePlugin';

export class InfoPlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "info:info": this.info.bind(this),
        };
    }

    private async info() {
        try {
            let serviceMsg = `Service Information\nservice: ${this.serverless.service.service}\nregion: ${this.provider.region}\nFunctions`;
            if (Object.keys(this.serverless.service.functions).length === 0) {
                serviceMsg += `\n  There are no functions deployed yet.`;
            } else {
                const ins = await this.getIns();
                for (let i = 0; i < ins.length; i++) {
                    const end = await ins[i].info();
                    serviceMsg += `\n ${end}`;
                }
            }
            log.notice(serviceMsg);
        } catch(error) {
            log.error(`Info error. err=${(error as Error).message}`);
        }
    }
}
