import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local for Snowflake credentials
dotenv.config({ path: '.env.local' });

// Custom plugin to handle local API saving and reading
const localApiPlugin = () => ({
  name: 'local-api-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      // Strip query params for route matching (cache-busting params etc.)
      const urlPath = (req.url || '').split('?')[0];

      if (req.method === 'GET' && urlPath.startsWith('/api/standards/')) {
        try {
          let targetFile = '';
          if (urlPath === '/api/standards/customized') {
            targetFile = 'customized-engineered-standards.json';
          } else if (urlPath === '/api/standards/global') {
            targetFile = 'global-engineered-standards.json';
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          const filePath = path.resolve(__dirname, 'src/data', targetFile);
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            const sample = parsed.cards?.[0]?.activities?.[0];
            console.log(`[API] GET ${urlPath} → ${targetFile} | Sample: ${sample?.name} = ${sample?.defaultSeconds}`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.end(raw);
          } else {
            console.log(`[API] GET ${urlPath} → FILE NOT FOUND: ${filePath}`);
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'File not found' }));
          }
        } catch (e) {
          console.error(`[API] GET ${urlPath} ERROR:`, e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read', details: String(e) }));
        }
        return;
      }

      if (req.method === 'POST' && urlPath.startsWith('/api/standards/')) {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            let targetFile = '';

            if (urlPath === '/api/standards/customized') {
              targetFile = 'customized-engineered-standards.json';
            } else if (urlPath === '/api/standards/global') {
              targetFile = 'global-engineered-standards.json';
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Not found' }));
              return;
            }

            const filePath = path.resolve(__dirname, 'src/data', targetFile);
            const sample = data.cards?.[0]?.activities?.[0];
            console.log(`[API] POST ${urlPath} → ${targetFile} | Sample: ${sample?.name} = ${sample?.defaultSeconds}`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, file: targetFile }));
          } catch (e) {
            console.error(`[API] POST ${urlPath} ERROR:`, e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save', details: String(e) }));
          }
        });
        return;
      }

      // ─── Snowflake Proxy ───
      if (req.method === 'POST' && urlPath === '/api/snowflake') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const snowflake = (await import('snowflake-sdk')).default;
            const { action, tableName } = JSON.parse(body);

            const privateKeyBase64 = process.env.SNOWFLAKE_PRIVATE_KEY_BASE64;
            if (!privateKeyBase64) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing SNOWFLAKE_PRIVATE_KEY_BASE64 env var' }));
              return;
            }

            const connection = snowflake.createConnection({
              account: 'IUTDGKJ-AWS_EASTUS',
              username: 'PRODUCT_INTERNAL_LOOKER',
              authenticator: 'SNOWFLAKE_JWT',
              privateKey: Buffer.from(privateKeyBase64, 'base64').toString('utf8'),
              warehouse: 'PRODUCT_LOOKER_WH',
              database: 'AIRBYTE_DATABASE',
              schema: 'PRODUCT_INTERNAL_DATA',
              role: 'PRODUCT_LOOKER_ROLE'
            });

            await new Promise<void>((resolve, reject) => {
              connection.connect((err: any) => {
                if (err) reject(err);
                else resolve();
              });
            });

            console.log('[Snowflake] Connected successfully');

            if (action === 'list_tables') {
              const tables: any[] = await new Promise((resolve, reject) => {
                connection.execute({
                  sqlText: 'SHOW TABLES IN SCHEMA AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA;',
                  complete: (err: any, _stmt: any, rows: any) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                  }
                });
              });

              const views: any[] = await new Promise((resolve, reject) => {
                connection.execute({
                  sqlText: 'SHOW VIEWS IN SCHEMA AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA;',
                  complete: (err: any, _stmt: any, rows: any) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                  }
                });
              });

              const tableNames = tables.map((r: any) => r.name);
              const viewNames = views.map((r: any) => r.name);
              const allObjects = [...tableNames, ...viewNames].filter(Boolean).sort();

              console.log(`[Snowflake] Found ${allObjects.length} objects`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, objects: allObjects }));
              return;
            }

            if (action === 'list_objects') {
              console.log(`[Snowflake] Pulling objects list from INFORMATION_SCHEMA...`);
              try {
                const query = `SELECT TABLE_NAME as "Name", TABLE_TYPE as "Type", ROW_COUNT as "Rows", BYTES as "Bytes" FROM AIRBYTE_DATABASE.INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PRODUCT_INTERNAL_DATA' ORDER BY TABLE_NAME ASC`;
                const rows = await new Promise((resolve, reject) => {
                  connection.execute({
                    sqlText: query,
                    complete: (err: any, _stmt: any, resRows: any) => {
                      if (err) reject(err);
                      else resolve(resRows || []);
                    }
                  });
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, rows }));
                return;
              } catch (err: any) {
                console.error(`[Snowflake] Failed to list objects:`, err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }

            if (action === 'list_accounts') {
              console.log(`[Snowflake] Pulling accounts list...`);
              let rows: any[] = [];
              try {
                const query = `SELECT * FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA."Account" ORDER BY "DisplayName" ASC LIMIT 1000`;
                rows = await new Promise((resolve, reject) => {
                  connection.execute({
                    sqlText: query,
                    complete: (err: any, _stmt: any, resRows: any) => {
                      if (err) reject(err);
                      else resolve(resRows || []);
                    }
                  });
                });
              } catch (firstErr) {
                console.log(`[Snowflake] First try failed for Accounts, attempting fallback column names...`);
                try {
                  const fallbackQuery = `SELECT * FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.ACCOUNT ORDER BY DISPLAYNAME ASC LIMIT 1000`;
                  rows = await new Promise((resolve, reject) => {
                    connection.execute({
                      sqlText: fallbackQuery,
                      complete: (err: any, _stmt: any, resRows: any) => {
                        if (err) reject(err);
                        else resolve(resRows || []);
                      }
                    });
                  });
                } catch (secondErr) {
                  console.error(`[Snowflake] Failed to fetch Accounts entirely:`, secondErr);
                }
              }

              console.log(`[Snowflake] Returned ${rows.length} account rows`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, rows }));
              return;
            }

            if (action === 'list_warehouses') {
              const payload = JSON.parse(body);
              const accountId = payload.accountId;
              console.log(`[Snowflake] Pulling warehouses for account ${accountId}...`);
              let rows: any[] = [];

              if (!accountId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: "accountId is required" }));
                return;
              }

              try {
                const query = `SELECT "Id", "Code" FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA."Warehouse" WHERE "AccountId" = ? ORDER BY "Code" ASC LIMIT 1000`;
                rows = await new Promise((resolve, reject) => {
                  connection.execute({
                    sqlText: query,
                    binds: [accountId],
                    complete: (err: any, _stmt: any, resRows: any) => {
                      if (err) reject(err);
                      else resolve(resRows || []);
                    }
                  });
                });
              } catch (firstErr) {
                console.log(`[Snowflake] First try failed for Warehouses, attempting fallback column names...`);
                try {
                  const fallbackQuery = `SELECT ID, CODE FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSE WHERE ACCOUNTID = ? ORDER BY CODE ASC LIMIT 1000`;
                  rows = await new Promise((resolve, reject) => {
                    connection.execute({
                      sqlText: fallbackQuery,
                      binds: [accountId],
                      complete: (err: any, _stmt: any, resRows: any) => {
                        if (err) reject(err);
                        else resolve(resRows || []);
                      }
                    });
                  });
                } catch (secondErr) {
                  console.error(`[Snowflake] Failed to fetch Warehouses entirely:`, secondErr);
                }
              }

              console.log(`[Snowflake] Returned ${rows.length} warehouse rows`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, rows }));
              return;
            }

            // pull_data_custom (specifically for WarehouseTask with filters)
            if (action === 'pull_data_custom') {
              const payload = JSON.parse(body);
              const ware = payload.warehouse;
              const bDate = payload.beginDate;
              const eDate = payload.endDate;
              const isTestMode = payload.isTestMode;

              // Query 1: Try with quoted specific names
              let queryA = `SELECT * FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA."WarehouseTask"`;
              const condA = [];
              if (ware) condA.push(`"Warehouse" = '${ware.replace(/'/g, "''")}'`);
              if (bDate) condA.push(`"Actual Start Timestamp" >= '${bDate}'`);
              if (eDate) condA.push(`"Actual Finish Timestamp" <= '${eDate}'`);
              if (condA.length > 0) queryA += ` WHERE ` + condA.join(' AND ');
              queryA += ` LIMIT ${isTestMode ? 100 : 150000}`;

              // Query 2: Airbyte tables with JOINs to resolve ID fields
              // All WAREHOUSETASK columns confirmed UPPERCASE from schema discovery
              const selectCols = [
                'wt.WAVENO',
                'wt.AIJOBTYPEDESCRIPTION',
                `CASE 
                    WHEN wt.WAREHOUSETASKTYPEID = 1 THEN 'Picking'
                    WHEN wt.WAREHOUSETASKTYPEID = 5 THEN 'Sorting'
                    WHEN wt.WAREHOUSETASKTYPEID = 6 THEN 'Packing'
                    ELSE CAST(wt.WAREHOUSETASKTYPEID AS VARCHAR)
                 END AS "TaskTypeName"`,
                'wt.FROMTASKUOMQUANTITY',
                'wt.EXECUTEDBY',
                'wt.ACTUALSTARTDATETIME',
                'wt.ACTUALFINISHDATETIME',
                // Resolved display fields from JOINs
                'u.EMAIL AS "UserEmail"',
                'acct.DISPLAYNAME AS "AccountName"',
                'cl.DISPLAYNAME AS "ClientName"',
                'wjt.CODE AS "WarehouseJobTypeName"',
                'wj.CODE AS "WarehouseJobCode"',
                'wh.CODE AS "WarehouseName"',
                'loc.CODE AS "LocationCode"',
                'so.CODE AS "OrderCode"',
              ].join(', ');

              // WAREHOUSEJOBTYPEID lives on WAREHOUSEJOB, not WAREHOUSETASK
              // So we chain: WAREHOUSETASK -> WAREHOUSEJOB -> WAREHOUSEJOBTYPE
              const joins = [
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.USER u ON wt.EXECUTEDBY = u.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.ACCOUNT acct ON wt.ACCOUNTID = acct.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.CLIENT cl ON wt.CLIENTID = cl.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSEJOB wj ON wt.WAREHOUSEJOBID = wj.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSEJOBTYPE wjt ON wj.WAREHOUSEJOBTYPEID = wjt.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSE wh ON wt.WAREHOUSEID = wh.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSELOCATION loc ON wt.FROMWAREHOUSELOCATIONID = loc.ID',
                'LEFT JOIN AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.SHIPMENTORDER so ON wt.SHIPMENTORDERID = so.ID',
              ].join(' ');

              let queryB = `SELECT ${selectCols} FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.WAREHOUSETASK wt ${joins}`;
              const condB: string[] = [];
              // "warehouse" value is now the Warehouse GUID (Id), matching WAREHOUSEID column
              if (ware) condB.push(`wt.WAREHOUSEID = '${ware.replace(/'/g, "''")}'`);
              if (bDate) condB.push(`wt.ACTUALSTARTDATETIME >= '${bDate}'`);
              if (eDate) condB.push(`wt.ACTUALFINISHDATETIME <= '${eDate}'`);
              if (condB.length > 0) queryB += ` WHERE ` + condB.join(' AND ');
              queryB += ` LIMIT ${isTestMode ? 100 : 150000}`;

              console.log(`[Snowflake] Pulling custom: Trying exact match schema first...`);

              let rows: any[] = [];
              try {
                rows = await new Promise((resolve, reject) => {
                  connection.execute({
                    sqlText: queryA,
                    complete: (err: any, _stmt: any, resRows: any) => {
                      if (err) reject(err);
                      else resolve(resRows || []);
                    }
                  });
                });
              } catch (firstErr) {
                console.log(`[Snowflake] Exact match failed. Falling back to Airbyte normalized uppercase schema...`);
                // Wait for the fallback query B
                try {
                  rows = await new Promise((resolve, reject) => {
                    connection.execute({
                      sqlText: queryB,
                      complete: (err: any, _stmt: any, resRows: any) => {
                        if (err) reject(err);
                        else resolve(resRows || []);
                      }
                    });
                  });
                } catch (secondErr: any) {
                  console.error(`[Snowflake] Both schemas failed. Query B error:`, secondErr.message);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Snowflake Error: " + secondErr.message }));
                  return;
                }
              }

              console.log(`[Snowflake] Returned ${rows.length} rows`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, rows }));
              return;
            }

            // pull_data
            if (!tableName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing tableName for pull_data action.' }));
              return;
            }

            const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
            const executeQuery = `SELECT * FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.${cleanTableName} LIMIT 50000`;
            console.log(`[Snowflake] Pulling: ${executeQuery}`);

            const rows: any[] = await new Promise((resolve, reject) => {
              connection.execute({
                sqlText: executeQuery,
                complete: (err: any, _stmt: any, rows: any) => {
                  if (err) reject(err);
                  else resolve(rows || []);
                }
              });
            });

            console.log(`[Snowflake] Returned ${rows.length} rows`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, rows }));
          } catch (e: any) {
            console.error('[Snowflake] ERROR:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Snowflake connection/query failed', details: e.message }));
          }
        });
        return;
      }

      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    localApiPlugin(),
  ],
  server: {
    host: '127.0.0.1', // Avoid uv_interface_addresses issues; use localhost only
    port: 4000,
    strictPort: true, // Fail if port 4000 is already in use
  },
})
