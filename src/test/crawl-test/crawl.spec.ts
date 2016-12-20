import { Expect, AsyncTest, Setup, Timeout } from 'alsatian';
import { crawNoiDung, removeClass } from '../../lib/craw';
import * as fs from 'fs';
import * as diff from 'diff';


export class CrawlTest {
    exampleContent: string;
    linkTest = 'http://vnexpress.net/tin-tuc/thoi-su/nua-gio-no-luc-cuu-nguoi-trong-can-nha-chay-o-sai-gon-3514462.html';


    @Setup
    public setup() {

    }

    @AsyncTest('noi dung lay ve phai dung ')
    @Timeout(99999)
    public testCrawNoiDung() {
        let searchString = '<table class="tplCaption" cellspacing="0" cellpadding="3" border="0" align="center">';
        let noclass = '<table class="" cellspacing="0" cellpadding="3" border="0" align="center">'
        return new Promise((res, rej) => {
            crawNoiDung(this.linkTest, 'div#left_calculator > div.fck_detail.width_common.block_ads_connect')
                .then(result => {
                    // let diffResult = diff.diffWords(result, this.exampleContent)
                    result = result.trim();
                    Expect(result).not.toEqual('');
                    Expect(typeof result).not.toEqual(`undefined`)
                    Expect(result.indexOf('<tbody>')).not.toEqual(-1);
                    Expect(result.indexOf(searchString)).not.toEqual(-1);
                    let htmlNoCLass = removeClass(result);
                    Expect(htmlNoCLass.indexOf(noclass)).not.toEqual(-1);
                    res();
                })
                .catch(error => rej(error));
        })
    }
}