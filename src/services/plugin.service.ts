import { FunctionService } from "./function.service";
import { FunctionClient, TriggerService } from "serverless-fgs-sdk";

export class PluginService {
    private functionService: FunctionService;
    private triggerService: TriggerService;
    constructor(
        public readonly client: FunctionClient,
        public readonly props: any = {}
    ) {
        this.functionService = new FunctionService(this.client.fgsClient, this.props.functions);
        this.triggerService = new TriggerService(this.client, this.props.functions.urn);
    }

    async deploy() {
        const { subCommand, events } = this.props;
        let result = [];
        if (['all', 'function'].includes(subCommand)) {
            const funcInfo = await this.functionService.deploy();
            result = result.concat(funcInfo.res);
        }
        if (['all', 'trigger'].includes(subCommand)) {
            if (subCommand === 'all' && events.length === 0) {
                return result;
            }
            for (let i = 0;i < events.length; i++) {
                this.triggerService.init(events[i]);
                const triggerInfo = await this.triggerService.deploy();
                result = result.concat(triggerInfo);
            }
        }
        return result;
    }

    async remove() {
        const { subCommand, events } = this.props;
        if (['all', 'function'].includes(subCommand)) {
            await this.functionService.remove();
        }
        if (['all', 'trigger'].includes(subCommand)) {
            if (subCommand === 'all' && events.length === 0) {
                return;
            }
            for (let i = 0;i < events.length; i++) {
                this.triggerService.init(events[i]);
                await this.triggerService.remove();
            }
        }
    }

    async info() {
        return await this.functionService.info();
    }

    async invoke(event) {
        await this.functionService.invoke(event);
    }
}