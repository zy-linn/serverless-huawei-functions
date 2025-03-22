import * as fs from "fs";
import * as compressing from 'compressing';
import { ServiceType } from "../models/interface";
import { merge, omit } from "lodash";

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

/**
 * 处理响应
 * @param param
 */
export function handlerResponse({ httpStatusCode, errorMsg, errorCode }) {
    if ((httpStatusCode >= 300 || httpStatusCode < 200) && errorCode !== 'FSS.0409')  {
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
    return str.replace(/\_(\w)/g, function(all, letter){
        return letter.toUpperCase();
    });
}
// 驼峰转换下划线
export function humpToUnderline(str = '') {
  return str.replace(/([A-Z])/g,"_$1").toLowerCase();
}``