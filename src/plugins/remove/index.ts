import Serverless, { Options } from "serverless";
import { BasePlugin } from '../basePlugin';

export class RemovePlugin extends BasePlugin {
    constructor(serverless: Serverless, options: Options) {
        super(serverless, options);
        this.hooks = {
            "remove:remove": this.remove.bind(this),
        };
    }

    private async remove() {
        const ins = await this.getIns();
        for (let i = 0; i < ins.length; i++) {
            await ins[i].remove();
        }
    }
}
