import * as fs from "fs";
import * as path from "path";
import * as compressing from 'compressing';
import { ServiceType } from "../models/interface";
import { merge, omit } from "lodash";
const fileType = require('file-type');

/**
 * 代码转化成base64
 * @param codePath 代码路径
 * @param name 临时的zip文件名称
 * @returns 
 */
export async function startZip(codePath: string, name = 'index.zip'): Promise<string> {
    const isZip = isZipFile(codePath);
    if (isZip) {
        return zipToBase64Async(codePath);
    }
    return new Promise((resolve, reject) => {
        const isDirectory = isPathDirectory(codePath);
        const basePath = isDirectory ? codePath : path.dirname(codePath);
        const zipPath = `${basePath}/${name}`;
        deleteFile(zipPath);
        const files: Array<any> = isDirectory ? fs.readdirSync(codePath) : [path.basename(codePath)];
        const zipStream = new compressing.zip.Stream();
        files.forEach(file => {
            zipStream.addEntry(`${basePath}/${file}`);
        });

        const destStream = fs.createWriteStream(zipPath);
        zipStream.pipe(destStream).on('finish', () => {
            try {
                const dataString = zipToBase64Async(zipPath);
                resolve(dataString);
            } catch (err) {
                reject(err);
            } finally {
                setTimeout(() => {
                    deleteFile(zipPath);
                }, 0);
            }
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

/**
 * 处理响应
 * @param param
 */
export function handlerResponse({ httpStatusCode, errorMsg, errorCode }) {
    if ((httpStatusCode >= 300 || httpStatusCode < 200) && errorCode !== 'FSS.0409') {
        throw new Error(errorMsg);
    }
}

/**
 * 扩展函数对象
 * @param functions 
 * @returns 
 */
export function extendFunctionInfos(functions: any) {
    if (!functions || !functions.extend) {
        return functions;
    }
    const func = merge({}, functions, functions.extend);
    return omit(func, ['extend']);
}

/**
 * 生成函数
 * @param region 区域
 * @param projectId 项目ID
 * @param funPackage 依赖
 * @param name 函数名
 * @param tag 版本
 * @returns 
 */
export function handlerUrn(region, projectId, funPackage, name, tag = '') {
    const urn = `urn:fss:${region}:${projectId}:function:${funPackage}:${name}`;
    return tag ? `${urn}:${tag}` : urn;
}

// 下划线转换驼峰
export function underlineToHump(str = '') {
    return str.replace(/\_(\w)/g, function (all, letter) {
        return letter.toUpperCase();
    });
}
// 驼峰转换下划线
export function humpToUnderline(str = '') {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * 判断是否为zip包
 * @param filePath 文件路径
 * @returns 
 */
export async function isZipFile(filePath) {
    try {
        const stream = fs.createReadStream(filePath);
        const type = await fileType.fromStream(stream);
        return type && type.ext === 'zip';
    } catch (err) {
        return false;
    }

}

/**
 * 判断路径是否为文件夹
 * @param filePath 文件路径
 * @returns 
 */
export function isPathDirectory(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.isDirectory();
    } catch (err) {
        return true;
    }
}

/**
 * 将zip转为base64
 * @param zipFilePath 
 * @returns 
 */
export function zipToBase64Async(zipFilePath) {
    try {
        const data = fs.readFileSync(zipFilePath);
        return Buffer.from(data).toString('base64');
    } catch (err) {
        throw new Error(err);
    }
}