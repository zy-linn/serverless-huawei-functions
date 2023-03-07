import * as fs from "fs";
import * as compressing from 'compressing';
import { ServiceType } from "../models/interface";

/**
 * 代码转化成base64
 * @param codePath 代码路径
 * @param name 临时的zip文件名称
 * @returns 
 */
export async function startZip(codePath: string, name = 'index.zip'): Promise<string> {
    const zipPath = `${codePath}/${name}`;
    deleteFile(zipPath);
    return new Promise((resolve, reject) => {
        const files: Array<any> = fs.readdirSync(codePath);
        const zipStream = new compressing.zip.Stream();
        files.forEach(file => {
            zipStream.addEntry(`${codePath}/${file}`);
        });

        const destStream = fs.createWriteStream(zipPath);
        zipStream.pipe(destStream).on('finish', () => {
            let data = fs.readFileSync(zipPath);
            let dataString = Buffer.from(data).toString('base64');
            setTimeout(() => {
                deleteFile(zipPath);
            }, 0);
            resolve(dataString);
        });
    });
}

/**
* 删除文件
* @param path 
*/
export function deleteFile(path: string): void {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

/**
 * 获取地址
 * @param region 
 * @param service 
 * @returns 
 */
export function getEndpoint(region = 'cn-north-4', service = ServiceType.FUNCTIONGRAPH) {
    if (service === ServiceType.IAM) {
        return 'https://iam.myhuaweicloud.com';
    }
    return `https://${service.toString()}.${region}.myhuaweicloud.com`;
}

/**
 * 随机生成字符串
 * @param len 长度
 * @returns 
 */
export function randomLenChar(len = 6) {
    const chars = 'abcdefhijkmnprstwxyz2345678'; // 去掉容易混淆的字符，oOL1,9gq,Uu,I1
    const maxPos = chars.length;
    let name = '';
    for (let i = 0; i < len; i += 1) {
        name += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return name;
}

/**
 * 判断是否为字符串
 * @param obj 
 * @returns 
 */
export function isString(obj) {
    return typeof obj === 'string';
}
