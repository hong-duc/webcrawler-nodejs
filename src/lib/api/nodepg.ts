import { Pool, PoolConfig, QueryResult } from 'pg';
import path = require('path');
import * as Promise from 'bluebird';
let config = require(path.join(__dirname, "..", "..", 'config.json'));
import { appDebug } from '../debug';

// khởi tạo 2 giá trị đầu lấy từ config
let limit = config.paging.limit;
let offset = config.paging.offset;

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


let soLuongDanhMuc = (): Promise<QueryResult> => {
    let queryText = `SELECT reltuples AS approximate_row_count FROM pg_class WHERE relname = 'DanhMucSite'`;

    return Promise.resolve(pool.query(queryText));
}

let layLinkDanhMucCon = (): Promise<QueryResult> => {
    return soLuongDanhMuc().then(result => {
        let rowCount = result.rows[0].approximate_row_count;
        if (offset > (rowCount + 2)) {
            offset = 0;
        }
    }).then(() => {
        return layLinkDanhMucSite();
    })
}

/**
 * @desc gọi xuống csdl và lấy danh sách các danh mục
 * @return danh sách các danh mục con trong Promise
 */
let layLinkDanhMucSite = (): Promise<QueryResult> => {
    // console.log('offset ' + offset)
    appDebug('offset ' + offset)

    let queryText = `
SELECT 
  dmb."DuongDan", 
  dmb."SoLuongTinDuyetTim" as soluong, 
  dmb."IDDanhMucSite", 
  dmb."TempateCrawlTieuDe", 
  dmb."TempateCrawlMoTa",  
  dmb."TempateCrawlImage", 
  dmb."TemplateCrawUrl", 
  dmb."TemplateCrawlNgayDang",
  dmb."TemplateCrawlContext",
  dmb."ParentID"
FROM 
  public."DanhMucSite" as dmb
LIMIT ${limit}
OFFSET ${offset};
`;


    return Promise.resolve(pool.query(queryText)).then(result => {
        // console.log(result.rowCount)
        offset += limit;
        return result;
    });
}

let persistDataBase = (): Promise<QueryResult> => {
    let queryText = `
        COPY "TinTuc" ("IDDanhMucSite","TieuDe","MoTa","ThoiGianDangTin","URLNews","URLThumbImage")
        FROM '${path.join(__dirname, "..", "..", "..", "tmp.csv")}'
        WITH (FORMAT 'csv', NULL "''")
    `

    return Promise.resolve(pool.query(queryText));


}


export { pool, layLinkDanhMucCon, persistDataBase, soLuongDanhMuc };