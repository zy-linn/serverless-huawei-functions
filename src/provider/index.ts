import { Options } from "serverless";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as ini from 'ini';
import { log } from '@serverless/utils/log';
import { FunctionClient, IAMClient, ICredentials, ILogger, Logger } from "serverless-fgs-sdk";

const logger: ILogger = {
    debug: msg => log.verbose(msg),
    info: msg => log.notice(msg),
    error: msg => log.error(msg),
    success: msg => log.success(msg),
};
const PROVIDER_NAME = 'huawei';
const KEY_SYMBOL = Symbol('key');
const FG_CLIENT_SYMBOL = Symbol('fg-client');
export default class Provider {

    private [FG_CLIENT_SYMBOL]: FunctionClient;
    private [KEY_SYMBOL]: ICredentials;
    public static getProviderName() {
        return PROVIDER_NAME;
    }

    public constructor(private readonly serverless: any, private readonly options: Options) {
        this.serverless.setProvider(PROVIDER_NAME, this);
    }

    get region() {
        return this.options.region || this.serverless.service.provider.region || 'cn-north-4';
    }

    getCredentials() {
        if (this[KEY_SYMBOL]) {
            return this[KEY_SYMBOL];
        }
        let credentials = this.serverless.service.provider.credentials;

        const credParts = credentials.includes(path.sep) ? credentials.split(path.sep) : credentials.split('/');

        if (credParts[0] === '~') {
            credParts[0] = os.homedir();
            credentials = credParts.reduce((memo, part) => path.join(memo, part), '');
        }
        const keyFileContent = fs.readFileSync(credentials, 'utf-8').toString();
        const keys = ini.parse(keyFileContent);
        this[KEY_SYMBOL] = {
            AccessKeyID: keys['access_key_id'],
            SecretAccessKey: keys['secret_access_key']
        };

        ['AccessKeyID', 'AccessKeyID'].forEach((field) => {
            if (!this[KEY_SYMBOL][field]) {
                throw new Error(`Credentials in ${credentials} does not contain ${field}`);
            }
        });

        return this[KEY_SYMBOL];
    }

    async getFgClient() {
        this.getCredentials();
        if (this[FG_CLIENT_SYMBOL]) {
            return this[FG_CLIENT_SYMBOL];
        }
        try {
            Logger.getIns().withLogger(logger).spinStop();
            const projectId = await new IAMClient().build(this[KEY_SYMBOL]).getProject(this.region);
            this[FG_CLIENT_SYMBOL] = new FunctionClient().build(this[KEY_SYMBOL], this.region, projectId);
            return this[FG_CLIENT_SYMBOL];
        } catch (error) {
            throw new Error('get client error');
        }
    }
}
