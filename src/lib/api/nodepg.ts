import { Pool, PoolConfig, QueryResult } from 'pg';
import path = require('path');
import * as Promise from 'bluebird';
let config = require(path.join(__dirname, "..", "..", 'config.json'));

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


let soLuongDanhMuc = () => {
    let queryText = ``;
}

/**
 * @desc gọi xuống csdl và lấy danh sách các danh mục con
 * @return danh sách các danh mục con trong Promise
 */
let layLinkDanhMucCon = (): Promise<QueryResult> => {
    console.log('offset ' + offset)
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
  dmb."ParentID" = dma.id
LIMIT ${limit}
OFFSET ${offset};
`;


    return Promise.resolve(pool.query(queryText).then((result) => {
        if (result.rowCount === 0) {
            offset = 0;
        } else {
            offset += limit;
        }
        return result;
    }));
}

let persistDataBase = (): Promise<QueryResult> => {
    let queryText = `
        COPY "TinTuc" ("IDDanhMucSite","TieuDe","MoTa","ThoiGianDangTin","URLNews","URLImage")
        FROM '${path.join(__dirname, "..", "..", "..", "tmp.csv")}'
        WITH (FORMAT 'csv', NULL "''")
    `

    return Promise.resolve(pool.query(queryText));


}


export { pool, layLinkDanhMucCon, persistDataBase };