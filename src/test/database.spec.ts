import { Expect, Test, AsyncTest } from 'alsatian';
import { layLinkDanhMucSite } from '../lib/api/nodepg';

export class DataBaseTest {

    @AsyncTest('kiem tra kieu du lieu cua pg query tra ve phai la string')
    public Test1() {
        return new Promise((res, rej) => {
            layLinkDanhMucSite(10, 0).then(result => {
                // console.log('row count: ' + result.rowCount)
                // console.log('kieu cua IDDanhMucSite: ' + typeof result.rows[0].IDDanhMucSite)
                // console.log('row ' + JSON.stringify(result.rows[0]))
            Expect((typeof result.rows[0].IDDanhMucSite)).toEqual('number');
                res();
            })
            .catch(error => {
                rej(error)})
        });
    }
}