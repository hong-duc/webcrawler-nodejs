import * as cheerio from 'cheerio';
import * as request from 'request';
import * as rp from 'request-promise';
import * as Promise from 'bluebird';
import { logger } from './lib/logging';
import { appDebug } from './lib/debug';
import { pool, layLinkDanhMucCon, persistDataBase } from './lib/api/nodepg';
import * as momentjs from 'moment';
import {
    domainToName,
    extractHttpAndDomainOnly,
    addDomain,
    download,
    extractDate,
    IDanhMucSite,
    ITinTuc,
    taoTinTuc,
    createCSVFile
} from './lib/util';






// process.on('unhandledRejection', function (e) {
//     console.log(e.message, e.stack)
// })


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
            // lấy các mô tả  cần thiết
            let title = $(element).find(danhMucCon.TempateCrawlTieuDe).text().trim();
            let mota = $(element).find(danhMucCon.TempateCrawlMoTa).text().trim();
            let newsUrl = $(element).find(danhMucCon.TemplateCrawUrl).attr('href');
            // thêm http vào đường dẫn nếu ko có
            newsUrl = addDomain(newsUrl, extractHttpAndDomainOnly(danhMucCon.DuongDan));
            let imageUrl = $(element).find(danhMucCon.TempateCrawlImage).attr('src').trim();
            let ngayDangTin = $(element).find(danhMucCon.TemplateCrawlNgayDang).text().trim();
            // download hình ảnh
            let rpImage = download(imageUrl, danhMucCon.DuongDan);
            // download ngày đăng tin
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
                appDebug('result: ' + result)
                if (result !== '') {
                    let mm = momentjs(result, 'DD/MM/YYYY');
                    appDebug(`moment: ${mm.format('YYYY-MM-DD HH:mm:ss')}`)
                    ngayDangTin = mm.format('YYYY-MM-DD HH:mm:ss');
                } else {
                    ngayDangTin = momentjs().format('YYYY-MM-DD HH:mm:ss');
                }
                appDebug('before tintuc: ' + ngayDangTin)
            }).then(() => {
                let tintuc = taoTinTuc(danhMucCon.IDDanhMucSite, title, mota, newsUrl, imageUrl, ngayDangTin);
                appDebug('after tintuc: ' + tintuc.ThoiGianDangTin)
                res(tintuc);
            }).catch((error: Error) => {
                appDebug(`Error: ${error.message}; ${error.stack}`)
                logger.error(`khi dang craw tin: ${error.message}; stack-trace: ${error.stack}`);
            })
        })
        arrayPromise.push(p);
    })



    return Promise.all<ITinTuc>(arrayPromise)
        .then(tintucs => {

            createCSVFile(tintucs);
            return persistDataBase();
        })
        .catch(error => {
            // console.error('Error: ', error)
            // return Promise.reject(error);
            logger.error(`khi chuan bi luu csdl: ${error.message}; stack-trace: ${error.stack}`)
        })
}


/**
 * @desc
 * đây là nơi tất cả bắt đầu
 */
let startRequest = () => {
    // console.log('start request');
    appDebug('start request')
    logger.info('start crawling')
    let arr = [];

    layLinkDanhMucCon().then((result) => {
        let danhmucsite = result.rows as IDanhMucSite[];
        // console.log(JSON.stringify(result.rows[0]))
        danhmucsite.forEach(dm => {
            if (dm.ParentID === -1) {
                return;
            }
            request(dm.DuongDan, (error, response, html) => {
                if (error) {
                    logger.error('khi dang request: ' + error.message)
                    return;
                }

                arr.push(crawLingHtml(html, dm));
            })
        })

        Promise.all(arr)
            .then(() => {
                setTimeout(startRequest, 3000);
            })
    })

}

startRequest();
console.log('server started');

