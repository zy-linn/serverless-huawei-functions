import axios from "axios";
import { HEALTHZ_PATH, HOST, INVOKE_PATH, MAX_WAIT_TIMES, STOP_PATH } from "../models/constants";


export class ApiService {
    async invokeFunction(event: string, port: number, urn = '') {
        try {
            let traceId = Math.random().toString(16);
            const {projectId, region} = this.handlerUrn(urn);
            const headers = { 
                'content-type': 'application/json', 
                'x-project-id': projectId,
                'x-trace-id': traceId, 
                'X-region-from': region,
                'x-cff-log-type': 'tail' , 
                'x-cff-request-version': 'v1',
            };
            return await this.invokeLocalFunctionApi(event, port, headers);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 校验容器是否启动
     * @param port 
     * @returns 
     */
    async checkContainer(port: number, isWaiting = false) {
        try {
            let waitTime = 0;
            let connect = false;
            const traceId = Math.random().toString(16);
            while (!connect) {
                if (!isWaiting && waitTime > MAX_WAIT_TIMES) {
                    throw new Error('Container start failed.');
                }
                const result = await this.checkContainerApi(port, traceId);
                if (!result) {
                    await this.sleep(500);
                    waitTime++;
                } else {
                    connect = true;
                    return true;
                }
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * 停止进程
     * @param port 
     * @returns 
     */
    async stopProcess(port: number) {
        try {
            const traceId = Math.random().toString(16);
            await this.stopContainerApi(port, traceId);
            return true;
        } catch (error) {
            return false;
        }
    }

    public sleep(ms: number = 500) {
        return new Promise(resolve =>
            setTimeout(resolve, ms)
        );
    }
    
    /**
       *本地触发函数
      */
    private invokeLocalFunctionApi(event: string, port: number, headers: {[key: string]: string}) {
        return new Promise((resolve, reject) => {
            axios({
                url: HOST + port + INVOKE_PATH,
                method: 'POST',
                headers,
                data: event,
            }).then((response) => {
                resolve(response.data);
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    /**
     *本地测试端口函数
     */
    private checkContainerApi(port: number, traceId: string) {
        return new Promise((resolve, reject) => {
            axios({
                url: HOST + port + HEALTHZ_PATH,
                method: 'GET',
                headers: { 'x-trace-id': traceId, 'Content-Type': 'application/json' },
            }).then((response) => {
                resolve('ok');
            }).catch(function (error) {
                resolve(null);
            });
        });
    }

    /**
     *本地测试端口函数
     */
     private stopContainerApi(port: number, traceId: string) {
        return new Promise((resolve, reject) => {
            axios({
                url: HOST + port + STOP_PATH,
                method: 'GET',
                headers: { 'x-trace-id': traceId, 'Content-Type': 'application/json' },
            }).then((response) => {
                resolve(response);
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    private handlerUrn(urn = '') {
        const list = urn?.split(':');
        if (!urn || list.length < 6) {
            return { projectId: '', region: ''};
        }

        return {
            projectId: list[3],
            region: list[2]
        };
    }
}