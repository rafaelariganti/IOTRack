require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const { InfluxDB } = require('@influxdata/influxdb-client');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const influxDB = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG);

let db;
async function connectMySQL() {
    db = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });
    console.log('MySQL Conectado!');
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS medias_rack (
            id INT AUTO_INCREMENT PRIMARY KEY,
            rack_id VARCHAR(50),
            media_temperatura FLOAT,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}
connectMySQL();

cron.schedule('*/5 * * * *', async () => {
    console.log('Rodando consolidação de dados...');
    try {
        const fluxQuery = `
            from(bucket: "${process.env.INFLUX_BUCKET}")
              |> range(start: -5m)
              |> filter(fn: (r) => r["_measurement"] == "rack01")
              |> filter(fn: (r) => r["_field"] == "temperatura")
              |> mean()
        `;
        
        let result = [];
        for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) {
            const o = tableMeta.toObject(values);
            result.push(o);
        }

        if (result.length > 0 && result[0]._value) {
            const mediaTemp = result[0]._value.toFixed(2);
            await db.execute(
                'INSERT INTO medias_rack (rack_id, media_temperatura) VALUES (?, ?)',
                ['RACK-01', mediaTemp]
            );
            console.log(`Média salva com sucesso: ${mediaTemp}°C`);
        }
    } catch (error) {
        console.error('Erro ao consolidar dados:', error);
    }
});

app.get('/api/medias', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM medias_rack ORDER BY data_registro DESC LIMIT 10');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados do MySQL' });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`API do SOC rodando na porta ${port}`);
});