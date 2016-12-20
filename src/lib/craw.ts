import * as cheerio from 'cheerio';
import * as request from 'request';
import * as rp from 'request-promise';
import * as Promise from 'bluebird';
import { logger } from './logging';
import { appDebug } from './debug';
import { pool, layLinkDanhMucCon, persistDataBase } from './api/nodepg';
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
} from './util';








/**
 *  lọc tin từ html
 */
export let crawLingHtml = (html, danhMucCon: IDanhMucSite): Promise<any> => {
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
            // let rpImage = download(imageUrl, danhMucCon.DuongDan);
            let rpImage = Promise.resolve(imageUrl);
            // download ngày đăng tin
            let rpDate: Promise<string>;

            if (ngayDangTin === '') {
                if (newsUrl.indexOf('video.') === -1) {

                    rpDate = rp(newsUrl).then(body => {
                        let $2 = cheerio.load(body);
                        ngayDangTin = $2(danhMucCon.TemplateCrawlNgayDang).text().trim();
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
                let tintuc = taoTinTuc(danhMucCon.IDDanhMucSite, title, mota, newsUrl, imageUrl, ngayDangTin, "");
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
            logger.error(`khi chuan bi luu csdl: ${error.message}; stack-trace: ${JSON.stringify(JSON.parse(error.stack))}`)
        })
}

/**
 * lấy nội dung từ template đưa vào
 */
export let crawNoiDung = (link: string, templateCrawNoiDung): Promise<string> => {
    return rp(link).then(body => {
        let $ = cheerio.load(body);
        let contain = $(templateCrawNoiDung).html();
        return contain;
    }).catch(error => Promise.reject(error))
}

/**
 * xóa hết class ra khỏi html
 */
export let removeClass = (html: string) => {
    let classregex = /class[ \t]*=[ \t]*"[^"]+"/g;
    return html.replace(classregex,'class=""');
}


/**
 * server  web crawler
 */
export let startRequest = () => {
    ;
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
                    logger.error(`khi dang request: ${error.message}; stack-trace: error.stack`)
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
