const mysql = require("mysql");
require('dotenv').config()
console.log(process.env)
console.log(process.env.DB_PASSWORD)
const db = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: "skripsihayatistore",
});
const idmining = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: "skripsihayatistore",
});

const express = require("express"); //import express
const cors = require('cors');
const app = express()
app.use(express.json())

app.listen(5100, () => {
    console.log("listening")
})

app.use(cors({credentials:true, origin:'http://localhost:3300'}));
app.get("/proses_mining_15", (req, res) => {
    const q = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 15";
    db.query(q, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });

  app.post("/produk_insert", (req, res) => {
    const insert = `insert into produk(id_produk, nama, id_kategori, stok, harga)
      values(?)`;
    const values = [...Object.values(req.body)];
    console.log("insert", values);
    db.query(insert, [values], (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json({ data });
    });
  });
  app.post("/mining_insert", (req, res) => {
    let idlookup = 0;
    idmining.query ('SELECT COUNT (*) FROM proses_mining',[], (err, results)=> {
      idlookup = (results + 1)
    });
    const insert2 = `insert into proses_mining(id, id_produk)
    values(?)`;
  const values2 = [idlookup, ...Object.values(req.body)];
  console.log("insert", values2);
  db.query(insert2, [values2], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json( data );
    });
  });

  app.post("/penjualan_insert", (req, res) => {
    let id = 0;
    db.query ('SELECT COUNT (*) FROM penjualan',[], (err, results)=> {
      id = (results + 1)
    });
    const insert3 = `insert into penjualan(id_penjualan, id_produk)
      values(?)`;
    const values3 = [id, ...Object.values(req.body)];
    console.log("insert", values3);
    db.query(insert3, [values3], (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });

  app.get("/penjualan", (req, res) => {
    const r = "SELECT * FROM penjualan INNER JOIN produk ON penjualan.id_produk = produk.id_produk ORDER BY produk.id_produk";
    db.query(r, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/proses_mining_30", (req, res) => {
    const r = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 30";
    db.query(r, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/proses_mining_50", (req, res) => {
    const s = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 50";
    db.query(s, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/proses_mining_100", (req, res) => {
    const t = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 100";
    db.query(t, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/proses_mining_all", (req, res) => {
    const u = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/kategori", (req, res) => {
    const u = "SELECT * FROM `kategori`";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/kategori/:id", (req, res) => {
    const u = "SELECT id_kategori FROM `kategori` as id";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/produk", (req, res) => {
    const insertproduct = "SELECT * FROM `produk` ";
    db.query(insertproduct, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/produk/id:", (req, res) => {
    const u = "SELECT id_produk FROM `produk` as id";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/penjualan", (req, res) => {
    const u = "SELECT * FROM `penjualan`";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });
  app.get("/penjualan/:id", (req, res) => {
    const u = "SELECT id_penjualan FROM `penjualan` as id";
    db.query(u, (err, data) => {
      console.log(err, data);
      if (err) return res.json({ error: err.sqlMessage });
      else return res.json( data );
    });
  });


