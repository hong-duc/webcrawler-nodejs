import * as cheerio from 'cheerio';
import * as request from 'request';
import * as rp from 'request-promise';
import * as Promise from 'bluebird';
import { logger } from './lib/logging';
import { appDebug } from './lib/debug';
import { pool, layLinkDanhMucCon, persistDataBase } from './lib/api/nodepg';
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
                logger.error(error.message);
            })
        })
        arrayPromise.push(p);
    })



    return Promise.all<ITinTuc>(arrayPromise)
        .then(tintucs => {
            // console.log(tintucs.length);
            appDebug(tintucs.length)
            createCSVFile(tintucs);
            return persistDataBase();
        })
        .catch(error => {
            // console.error('Error: ', error)
            // return Promise.reject(error);
            logger.error(error.message)
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
            if(dm.ParentID === -1){
                return;
            }
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
console.log('server started');

