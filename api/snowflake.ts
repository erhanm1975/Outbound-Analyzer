import { VercelRequest, VercelResponse } from '@vercel/node';
import snowflake from 'snowflake-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Load the DER file contents as a base64 encoded string from secure environment variables
    const privateKeyBase64 = process.env.SNOWFLAKE_PRIVATE_KEY_BASE64;
    if (!privateKeyBase64) {
        return res.status(500).json({ error: "Missing SNOWFLAKE_PRIVATE_KEY_BASE64 env var" });
    }

    try {
        const connection = snowflake.createConnection({
            account: "IUTDGKJ-AWS_EASTUS",
            username: "PRODUCT_INTERNAL_LOOKER",
            authenticator: "SNOWFLAKE_JWT",
            // Convert the base64 string back into a UTF-8 PEM string
            privateKey: Buffer.from(privateKeyBase64, 'base64').toString('utf8'),
            warehouse: "PRODUCT_LOOKER_WH",
            database: "AIRBYTE_DATABASE",
            schema: "PRODUCT_INTERNAL_DATA",
            role: "PRODUCT_LOOKER_ROLE"
        });

        const { action, tableName } = req.body || {};

        await new Promise<void>((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (action === 'list_tables') {
            // Fetch tables and views
            const tables = await new Promise<any[]>((resolve, reject) => {
                connection.execute({
                    sqlText: "SHOW TABLES IN SCHEMA AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA;",
                    complete: (err, stmt, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                });
            });

            const views = await new Promise<any[]>((resolve, reject) => {
                connection.execute({
                    sqlText: "SHOW VIEWS IN SCHEMA AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA;",
                    complete: (err, stmt, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                });
            });

            // Extract just the names
            const tableNames = tables.map(r => r.name);
            const viewNames = views.map(r => r.name);
            const allObjects = [...tableNames, ...viewNames].filter(Boolean).sort();

            return res.status(200).json({ success: true, objects: allObjects });
        }

        // Default or 'pull_data' logic
        if (!tableName) {
            return res.status(400).json({ error: "Missing tableName for pull_data action." });
        }

        // We sanitize strictly to characters and underscores to prevent SQL injection in the raw template
        const cleanTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const executeQuery = `SELECT * FROM AIRBYTE_DATABASE.PRODUCT_INTERNAL_DATA.${cleanTableName} LIMIT 50000`;

        const rows = await new Promise<any[]>((resolve, reject) => {
            connection.execute({
                sqlText: executeQuery,
                complete: (err, stmt, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            });
        });

        return res.status(200).json({ success: true, rows });
    } catch (error: any) {
        console.error("Snowflake error:", error);
        return res.status(500).json({ error: "Snowflake connection/query failed", details: error.message });
    }
}
