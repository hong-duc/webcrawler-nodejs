import * as request from 'request';
import mkdirp = require('mkdirp');
import * as fs from 'fs';
import json2csv = require('json2csv');
import { logger } from './logging';
// import { appDebug } from './debug';


interface IDanhMucSite {
    IDDanhMucSite: number;
    DuongDan: string;
    soluong: number;
    TempateCrawlTieuDe: string;
    TempateCrawlMoTa: string;
    TempateCrawlImage: string;
    TemplateCrawUrl: string;
    TemplateCrawlNgayDang: string;
    TemplateCrawlContext: string;
    ParentID: number;
}

interface ITinTuc {
    IDDanhMucSite: number;
    TieuDe: string;
    MoTa: string;
    ThoiGianDangTin: string;
    URLNews: string;
    URLImage: string;
}

/**
 * chuyển 1 link url sang tên gọi
 * vd: http://vnexpress.net/ => vnexpress_net
 */
let domainToName = (url: string) => {
    let domain: string;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    // remove the www. part
    if (domain.indexOf('www.') > -1) {
        domain = domain.split('www.')[1];
    }

    domain = domain.replace('.', '_');

    return domain;
}

/**
 * @desc dùng để lấy http và tên domain từ 1 url
 */
let extractHttpAndDomainOnly = (url: string) => {
    let arr = url.split('/');
    return arr[0] + '//' + arr[2];
}

/**
 * @desc
 * kiểm tra nếu thiếu http thì thêm vào
 * @param domain phai la http://domain/
 */
let addDomain = (url: string, domain: string): string => {
    if (url.indexOf('http://') !== -1) {
        return url;
    }

    return domain + url;
}

/**
 * lấy ngày theo format là dd/MM/YYYY ra khỏi chuỗi
 */
let extractDate = (string: string): string => {
    let regex = /\d+\/\d+\/\d+/g;
    let result = string.match(regex);
    return result ? result[0] : "";
}

/**
 * @description 
 * download và lưu hình ảnh xuống server 
 * @return 
 * link dẫn tới file ảnh
 */
let download = (uri: string, linkUrl: string): Promise<string> => {

    // loại bỏ / ở cuối dòng
    let temp = uri.replace(/\/$/g, '');
    // lấy phần /..sda ở cuối dòng
    let fileName = temp.split('/').pop();

    // loại bỏ phần query nếu có
    if (fileName.lastIndexOf('?') !== -1) {
        fileName = fileName.split('?')[0];
    }
    // trích cái tên domain từ url ra thành tên folder;
    let folder = domainToName(linkUrl);

    // tên file dùng để save
    let finalName = `${folder}/${fileName}`;

    return new Promise<string>((res, rej) => {
        mkdirp(folder, (err, made) => {
            if (err) {
                console.log(err);
                rej(err);
                return;
            }
            let stream = request(uri).pipe(fs.createWriteStream(finalName));
            stream.on('close', () => res(finalName));
            stream.on('error', (error) => rej(error));
        })
    })
}

/**
 * 
 * @desc tạo tintuc object
 */
let taoTinTuc = (IDDanhMucSite: number, title: string, mota: string, newsUrl: string, imageUrl: string, ngayDangTin: string): ITinTuc => {
    let tintuc: ITinTuc = {
        IDDanhMucSite: IDDanhMucSite,
        TieuDe: title,
        MoTa: mota,
        ThoiGianDangTin: ngayDangTin,
        URLNews: newsUrl,
        URLImage: imageUrl,
    }

    return tintuc;
}

/**
 * @desc tạo ra file csv
 */
let createCSVFile = (tintucs: ITinTuc[]) => {
    // console.log(tintucs[0].URLNews);
    // appDebug.log(tintucs[0].URLNews)
    try {
        let result = json2csv({
            data: tintucs,
            hasCSVColumnTitle: false,
            defaultValue: 'NULL',
            doubleQuotes: '',
        });

        // đổi hết "" thành ''
        result = result.replace(/""/g, `''`);
        fs.writeFileSync('tmp.csv', result);

    } catch (error) {
        // console.log(error);
        // appDebug.log(error)
        logger.error(error.message)
    }

}

export {
    domainToName,
    extractHttpAndDomainOnly,
    addDomain,
    extractDate,
    download,
    taoTinTuc,
    ITinTuc,
    IDanhMucSite,
    createCSVFile
} 