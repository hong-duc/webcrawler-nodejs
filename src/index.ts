import * as cheerio from 'cheerio';
import * as request from 'request';
import * as rp from 'request-promise';
import * as Promise from 'bluebird';
import * as fs from 'fs';
import { Pool, PoolConfig, QueryResult } from 'pg';
import debug = require('debug');
import mkdirp = require('mkdirp');
import json2csv = require('json2csv');
import path = require('path');



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
}

interface ITinTuc {
    IDDanhMucSite: number;
    TieuDe: string;
    MoTa: string;
    ThoiGianDangTin: string;
    URLNews: string;
    URLImage: string;
}



process.on('unhandledRejection', function (e) {
    console.log(e.message, e.stack)
})


let poolConfig: PoolConfig = {
    user: 'duc',
    password: '12345678',
    database: 'postgres',
    host: 'localhost',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000
}

let pool = new Pool(poolConfig);


/**
 * @desc gọi xuống csdl và lấy danh sách các danh mục con
 * @return danh sách các danh mục con trong Promise
 */
let layLinkDanhMucCon = (): Promise<QueryResult> => {
    let queryText = `
SELECT 
  dmb."DuongDan", 
  dma.soluong, 
  dmb."IDDanhMucSite", 
  dmb."TempateCrawlTieuDe", 
  dmb."TempateCrawlMoTa",  
  dmb."TempateCrawlImage", 
  dmb."TemplateCrawUrl", 
  dmb."TemplateCrawlNgayDang",
  dmb."TemplateCrawlContext"
FROM 
  public."DanhMucSite" as dmb,
  (SELECT "IDDanhMucSite" as id,"SoLuongTinDuyetTim" as soluong FROM "DanhMucSite" WHERE "ParentID" = -1) as dma
WHERE 
  dmb."ParentID" = dma.id;
`;


    return Promise.resolve(pool.query(queryText));
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

//testing-------------------
// download('http://img.f31.vnecdn.net/2016/12/05/nguoi-han-quoc-xin-loi-nhan-ch-7852-1918-1480955667_180x108.jpg','vnexpress_net')
//     .then((result) => {
//         console.log(typeof result);
//         console.log(result)
//         return result;
//     })
//     .catch(error => {
//         console.error(error);
//     })


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
    try {
        let result = json2csv({
            data: tintucs,
            hasCSVColumnTitle: false,
            defaultValue: 'NULL',
            doubleQuotes: '',
        });

        result = result.replace(/""/g, `''`);

        // if (fs.existsSync('tmp.csv')) {
        //     fs.writeFileSync('tmp_2.csv', result);
        // } else {
        //     fs.writeFileSync('tmp.csv', result);
        // }
        // console.log(result);
        fs.writeFileSync('tmp.csv', result);

    } catch (error) {
        console.log(error);
    }

}

let persistDataBase = (): Promise<QueryResult> => {
    let queryText = `
        COPY "TinTuc" ("IDDanhMucSite","TieuDe","MoTa","ThoiGianDangTin","URLNews","URLImage")
        FROM '${path.join(__dirname, "..", "tmp.csv")}'
        WITH (FORMAT 'csv', NULL "''")
    `

    return Promise.resolve(pool.query(queryText));


}

// persistDataBase();


/**
 *  lọc tin từ html
 */
let crawLingHtml = (html, danhMucCon: IDanhMucSite): Promise<any> => {
    let $ = cheerio.load(html);
    let arrayPromise = [];

    $(danhMucCon.TemplateCrawlContext).each((index, element) => {
        if (index === danhMucCon.soluong) {
            return false;
        }

        let p = new Promise<ITinTuc>((res, rej) => {
            let title = $(element).find(danhMucCon.TempateCrawlTieuDe).text().trim();
            let mota = $(element).find(danhMucCon.TempateCrawlMoTa).text().trim();
            let newsUrl = $(element).find(danhMucCon.TemplateCrawUrl).attr('href');
            newsUrl = addDomain(newsUrl, extractHttpAndDomainOnly(danhMucCon.DuongDan));
            let imageUrl = $(element).find(danhMucCon.TempateCrawlImage).attr('src').trim();
            let ngayDangTin = $(element).find(danhMucCon.TemplateCrawlNgayDang).text().trim();
            let rpImage = download(imageUrl, danhMucCon.DuongDan);
            let rpDate: Promise<string>;

            if (ngayDangTin === '') {
                if (newsUrl.indexOf('video.') === -1) {

                    rpDate = rp(newsUrl).then(body => {
                        $ = cheerio.load(body);
                        ngayDangTin = $(danhMucCon.TemplateCrawlNgayDang).text().trim();
                        ngayDangTin = extractDate(ngayDangTin);
                        return ngayDangTin;
                    });
                }
            } else {
                ngayDangTin = extractDate(ngayDangTin);
            }

            rpImage.then(result => {
                imageUrl = result;
            }).then(() => {
                if (rpDate !== undefined) {
                    return rpDate;
                } else {
                    return ngayDangTin;
                }
            }).then(result => {
                if (result !== '') {
                    let date = new Date(result);
                    ngayDangTin = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
                } else {
                    ngayDangTin = result;
                }
            }).then(() => {
                let tintuc = taoTinTuc(danhMucCon.IDDanhMucSite, title, mota, newsUrl, imageUrl, ngayDangTin);
                res(tintuc);
            }).catch(error => {
                console.error('Error: ', error);
            })
        })
        arrayPromise.push(p);
    })



    return Promise.all<ITinTuc>(arrayPromise)
        .then(tintucs => {
            // console.log(tintucs.length);
            createCSVFile(tintucs);
            return persistDataBase();
        })
        .then(result => {
            console.log(result.rowCount);
        })
        .catch(error => {
            console.error('Error: ', error)
            // return Promise.reject(error);
        })
}


/**
 * @desc
 * đây là nơi tất cả bắt đầu
 */
let startRequest = () => {
    console.log('start request');
    let arr = [];

    layLinkDanhMucCon().then((result) => {
        let danhmucsite = result.rows as IDanhMucSite[];
        danhmucsite.forEach(dm => {
            request(dm.DuongDan, (error, response, html) => {
                if (error) {
                    console.log(error);
                    return;
                }

                arr.push(crawLingHtml(html, dm));
            })
        })

        Promise.all(arr)
            .then(() => {
                setTimeout(startRequest, 10000);
            })
    })

}

startRequest();


