import * as net from 'net';
import { PORT_DEFAULT, PORT_NOT_FOUND } from '../models/constants';


export class PortService {
    private static instance: PortService;

    private portMap: Map<string, number>;
    private debugPortMap: Map<string, number>;

    constructor() {
        this.portMap = new Map<string, number>();
        this.debugPortMap = new Map<string, number>();
    }

    /**
     * 获取单实例
     * @returns 
     */
    public static getInstance(): PortService {
        if (!PortService.instance) {
            PortService.instance = new PortService();
        }

        return PortService.instance;
    }

    public setPort(name: string, port: number) {
        this.portMap.set(name, port);
    }

    public setDebugPort(name: string, debugPort: number) {
        this.debugPortMap.set(name, debugPort);
    }

    public getAllPort(): Array<number> {
        return [...this.portMap.values()];
    }

    /**
     * 获取端口号
     * 如果needCreate为true，端口不存在是创建新的
     * @param name 函数名称
     * @param needCreate 是否需要创建
     * @returns 
     */
    public async getPort(name: string, needCreate = false): Promise<number> {
        if (!needCreate || this.portMap.has(name)) {
            return this.portMap.get(name) ?? PORT_NOT_FOUND;
        }
        const port = await this.getIdlePort();
        PortService.getInstance().setPort(name, port);
        return port;
    }

    /**
     * 获取Debug端口号
     * 如果needCreate为true，端口不存在是创建新的
     * @param name 函数名称
     * @param needCreate 是否需要创建
     * @returns 
     */
    public async getDebugPort(name: string, needCreate = false): Promise<number> {
        if (!needCreate || this.debugPortMap.has(name)) {
            return this.debugPortMap.get(name) ?? PORT_NOT_FOUND;
        }
        const debugPort = await this.getIdlePort();
        PortService.getInstance().setDebugPort(name, debugPort);
        return debugPort;
    }

    /**
     * 获取有效的端口
     * @returns 
     */
    private async getIdlePort(): Promise<number> {
        let port = PORT_DEFAULT + Math.floor(Math.random() * 1000);
        while (await this.checkPort(port)) {
            port = PORT_DEFAULT + Math.floor(Math.random() * 1000);
        }
        return port;
    }

    /**
     * 判断当前端口是否被占用
     * @param port 
     * @returns 
     */
    private async checkPort(port: number): Promise<boolean> {
        return new Promise((resolve, rej) => {
            let server = net.createServer().listen(port);
            server.on('listening', function () {
                server.close();
                resolve(false);
            });

            server.on('error', function () {
                resolve(true);
            });
        });
    }
}