const mysql = require("mysql2");

const multer = require("multer");

const upload = multer({ dest: 'uploads/' });
const kmeans = require('node-kmeans');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const fs = require('fs')
const db = mysql.createConnection({
  host: "mysql-3a3beccc-hayatistore.f.aivencloud.com",
  user: "avnadmin",
  port: "15554",
  password: "AVNS_BWZ389d1XfCW7Ny0obc",
  database: "defaultdb",
  ssl: {
    ca: [
      fs.readFileSync('ca.pem')
    ]}
});
const idmining = mysql.createConnection({
  host: "mysql-3a3beccc-hayatistore.f.aivencloud.com",
  user: "avnadmin",
  password: "AVNS_BWZ389d1XfCW7Ny0obc",
  database: "defaultdb",
  ssl: {}
});

const express = require("express"); //import express
const cors = require('cors');
const app = express()
app.use('/uploads', express.static('uploads'));
app.use(express.json())
app.use(cookieParser());
const sharp = require('sharp');
app.listen(8080, () => {
  console.log("listening")
})

app.use(cors({ credentials: true, origin: 'https://hayatistore.pages.dev' }));

function euclideanDistance(point1, point2) {
  let sumSquaredDiffs = 0;
  for (let i = 0; i < point1.length; i++) {
    sumSquaredDiffs += Math.pow(point1[i] - point2[i], 2);
  }
  return Math.sqrt(sumSquaredDiffs);
}
app.get('/clusters_new', (req, res) => {
  const truncatetable = 'TRUNCATE TABLE customer_clusters';
  db.query(truncatetable, (error) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
      return;
    }
    console.log('Truncated customer_clusters table');
  });
  const query = 'SELECT ID, NAMA, JAN, FEB, MAR, APR, MEI, JUN, JUL, AGUST, SEPT, OKT, NOV, DES FROM customerhistory ORDER BY ID';
  db.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      const data = results.map(row => [row.JAN, row.FEB, row.MAR, row.APR, row.MEI, row.JUN, row.JUL, row.AGUST, row.SEPT, row.OKT, row.NOV, row.DES]);
      const k = 2
      const maxIterations = 2;
      kmeans.clusterize(data, { k, maxIterations }, (err, clusters) => {
        if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
        } else {
          const totalsum = data.reduce((acc, row) => acc + row.reduce((acc, value) => acc + value, 0), 0);
          console.log('totalsum', totalsum);
          const customeridnama = results.map(row => [row.ID, row.NAMA]);
          const customerClusters = customeridnama.map((customer, index) => {
            const centroids = clusters.map(cluster => cluster.centroid);
            const distances = data.map(point => centroids.map(centroid => euclideanDistance(point, centroid)));
            const assignedClusters = distances.map((distances) => {
              const minIndex = distances.indexOf(Math.min(...distances));
              return minIndex + 1;
            });
            const assignedClusterIndex = assignedClusters[index];
            const clusterDistance = distances[index][assignedClusterIndex - 1];
            const sumCentroids = centroids.map(centroid => centroid.reduce((acc, value) => acc + value, 0));
            console.log('centroidsum', sumCentroids[assignedClusterIndex - 1])
            const percentage = distances.map((distances) => {
              const distanceToAssignedCentroid = distances[assignedClusterIndex - 1];
              const diff = clusterDistance - distanceToAssignedCentroid;
              if (diff === 0) {
                return 1;
              }
              return 1 - (((totalsum - sumCentroids[assignedClusterIndex - 1]) / diff) * 1).toFixed(2);
            });
            const clusterObj = {
              id: customer[0],
              nama: customer[1],
              clusterIndex: assignedClusterIndex,
              centroids: centroids[assignedClusterIndex - 1],
              centroidsSum: sumCentroids[assignedClusterIndex - 1],
              distances: distances[index],
              percentage: percentage[assignedClusterIndex - 1],
              total: sumCentroids[assignedClusterIndex - 1]
            };
            return clusterObj;
          });
          console.log('customerClusters', customerClusters);
          res.send({ customerClusters });

          const insert = `INSERT INTO customer_clusters (customer_nama, cluster_ind, centroid, distance, total, percentage) VALUES (?, ?, ?, ?, ?, ?)`;
          const values = customerClusters.map((customer) => {
            const formattedDistances = customer.distances.map((distance) => {
              const distanceNumber = Number(distance);
              return isNaN(distanceNumber) ? distance : distanceNumber.toFixed(5);
            });
            return [
              `"${customer.nama}"`,
              `"${customer.clusterIndex}"`,
              `${customer.centroids}`,
              `${formattedDistances}`,
              `${customer.centroidsSum}`,
              `${customer.percentage}`,
            ];
          });
          values.forEach((row) => {
            db.query(insert, row, (err, result) => {
              if (err) {
                console.error(err);
              } else {
                console.log(result);
              }
            });
          });
        }
      });
    }
  });
});
app.get("/proses_mining_15", (req, res) => {
  const q = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 15";
  db.query(q, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
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

app.post("/insertDataCart", (req, res) => {
  const insert = `insert into customercartlist(idcust, idproduct)
      values(?)`;
  const values = [...Object.values(req.body)];
  console.log("insert", values);
  db.query(insert, [values], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json({ data });
  });
});

app.post("/desc_insert", (req, res) => {
  const insert = `insert into productdesc(id_produk, description) values(?)`;
  const values = [...Object.values(req.body)];
  console.log("insert", values);
  db.query(insert, [values], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json({ data });
  });
});

app.post('/cart_insert', upload.single('buktipembayaran'), async (req, res) => {
  const { id, nama, alamat, nomortelp, produk, quantity, totalbayar } = req.body;
  const buktipembayaran = req.file.filename;
  const pictureWithExtension = buktipembayaran + '.jpg'; // Append .jpg extension

  try {
    await sharp(req.file.path) // Use sharp to convert the image
      .jpeg()
      .toFile(`uploads/${pictureWithExtension}`);
    const insert = `INSERT INTO cartcustomer (idcustomer, nama, alamat, nomortelp, produk, quantity, totalbayar, status, buktipembayaran) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [id, nama, alamat, nomortelp, produk, quantity, totalbayar, "Belum Dikonfirmasi", pictureWithExtension];
    db.query(insert, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ error: err.sqlMessage });
      } else {
        return res.json({ result });
      }
    });
    const updateQuery = `UPDATE customerhistory SET totalpembayaran = totalpembayaran + ${totalbayar} WHERE id = ${id}`;
    db.query(updateQuery, (updateError, updateResult) => {
      if (updateError) {
        console.error('Error updating total payment:', updateError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      else {
        console.log('Updated total payment:', updateResult);
      }

    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'An error occurred while converting the image to JPEG.' });
  }
  const deleteData = "DELETE FROM customercartlist WHERE idcust = ?";
  const valueDelete = [id];
  db.query(deleteData, valueDelete, (deleteError, deleteResult) => {
    if (deleteError) {
      console.error("Error deleting row:", deleteError);
      return res.status(500).json({ error: deleteError.sqlMessage });
    } else {
      console.log("Deleted row:", deleteResult);
    }
  });
});

app.get("/removecart/", (req, res) => {
  const idcust = req.query.idcust;
  const idproduk = req.query.idproduk
  console.log('idproduk', idproduk)
  const deleteData = `DELETE FROM customercartlist WHERE idcust = ? AND idproduct = ?`;
  const valueDelete = [idcust, idproduk];

  db.query(deleteData, valueDelete, (deleteError, deleteResult) => {
    if (deleteError) {
      console.error("Error deleting rows:", deleteError);
      return res.status(500).json({ error: deleteError.sqlMessage });
    } else {
      console.log("Deleted rows:", deleteResult.affectedRows);
      res.status(200).send('Data updated successfully');
    }
  });
});

app.post('/produk_insert_picture', upload.single('picture'), async (req, res) => {
  const { id_produk, nama, id_kategori, stok, harga } = req.body;
  const picture = req.file.filename;
  const pictureWithExtension = picture + '.jpg'; // Append .jpg extension

  try {
    await sharp(req.file.path) // Use sharp to convert the image
      .jpeg()
      .toFile(`uploads/${pictureWithExtension}`);

    const insert = `INSERT INTO produk(id_produk, nama, id_kategori, stok, harga, picture) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [id_produk, nama, id_kategori, stok, harga, pictureWithExtension];

    db.query(insert, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ error: err.sqlMessage });
      } else {
        return res.json({ result });
       
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while converting the image to JPEG.' });
  }
});
app.get('/cartlist/:id', async (req, res) => {


  const query = `
  SELECT customercartlist.idcust, produk.*
FROM customercartlist
JOIN customer ON customercartlist.idcust = customer.id
JOIN produk ON customercartlist.idproduct = produk.id_produk
WHERE customercartlist.idcust = ?;
    `;
  db.query(query, (error, results) => {

    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(results);
    }
  });
});
app.get('/adddiscount/:id', (req, res) => {
  const id_produk = req.params.id;
  const u = "INSERT INTO `produkdiskon` values (?,'0')";
  try {
    db.query(u, [id_produk], (err, data) => {
      if (err) {
        console.log(err);
        return res.json({ error: err.sqlMessage });
      } else {
        console.log(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.json({ error: err.message });
  }
});
app.post('/update-discount', (req, res) => {
  const { id_produk, totaldiscount } = req.body;
  const query = 'UPDATE produkdiskon SET totaldiscount=? WHERE id_produk=?';
  const values = [totaldiscount, id_produk];
  db.query(query, values, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      console.log(result.affectedRows + ' record(s) updated');
      res.send('Data updated successfully');
    }
  });
});

app.get('/get-discount-produk', (req, res) => {
  const query = `SELECT p.id_produk, p.nama, p.harga, SUM(pd.totaldiscount) AS totaldiskon FROM produk p JOIN produkdiskon pd ON p.id_produk = pd.id_produk GROUP BY p.id_produk, p.nama, p.harga
  `;
  db.query(query, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
     return res.json(data);
    }
  });
});

app.get('/adddiscountcust/:id', (req, res) => {
  const id = req.params.id;
  const u = "INSERT INTO `customerwithdiscount` values (?)";
  try {
    db.query(u, [id], (err, data) => {
      if (err) {
        console.log(err);
        return res.json({ error: err.sqlMessage });
      } else {
        console.log(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.json({ error: err.message });
  }
});

app.get('/get-discount-cust', (req, res) => {
  const query = `SELECT c.id, c.nama
  FROM customerwithdiscount cd
  JOIN customer c ON c.id = cd.id
  `;
  db.query(query, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
     return res.json(data);
    }
  });
});
app.get('/get-discount-cust/:id', (req, res) => {
  const id = req.params.id;
  const query = `SELECT c.id, c.nama
  FROM customerwithdiscount cd
  JOIN customer c ON c.id = cd.id WHERE cd.id=?
  `;
  db.query(query, [id], (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
     return res.json(data);
    }
  });
});
app.get("/produkpicture", (req, res) => {
  const r = "SELECT * FROM `produk` ORDER BY id_produk";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else {
      return res.json(data);
    }
  });
});

app.get("/produkpicturecat/id", (req, res) => {
  const r = "SELECT * FROM `produk` WHERE id_kategori = ? ORDER BY id_produk";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else {
      return res.json(data);
    }
  });
});

app.patch("/produk_patch", (req, res) => {
  const insert = `UPDATE produk SET id_produk = ? nama = ? id_kategori = ? stok = ? harga = ?`;
  console.log("insert");
  db.query(insert, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json({ data });
  });
});

app.post("/mining_insert", (req, res) => {
  let idlookup = 0;
  idmining.query('SELECT COUNT (*) FROM proses_mining', [], (err, results) => {
    idlookup = (results + 1)
  });
  const insert2 = `insert into proses_mining(id, id_produk)
    values(?)`;
  const values2 = [idlookup, ...Object.values(req.body)];
  console.log("insert", values2);
  db.query(insert2, [values2], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.post("/penjualan_insert", (req, res) => {
  let id = 0;
  db.query('SELECT COUNT (*) FROM penjualan', [], (err, results) => {
    id = (results + 1)
  });
  const insert3 = `insert into penjualan(id_penjualan, id_produk)
      values(?)`;
  const values3 = [id, ...Object.values(req.body)];
  console.log("insert", values3);
  db.query(insert3, [values3], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/penjualan", (req, res) => {
  const r = "SELECT * FROM penjualan INNER JOIN produk ON penjualan.id_produk = produk.id_produk ORDER BY produk.id_produk";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/customerkmeans", (req, res) => {
  const r = "SELECT `customer_nama`, `cluster_ind`, `centroid`, `distance`, `total` FROM `customer_clusters` ORDER BY `total` ASC;";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/customerkmeanspercentage", (req, res) => {
  const r = "SELECT `percentage` FROM `customer_clusters` ORDER BY CAST(`customer_clusters`.`percentage` AS DECIMAL) ASC;";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/proses_mining_30", (req, res) => {
  const r = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 30";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/proses_mining_pembeli", (req, res) => {
  const r = "SELECT * FROM proses_mining_pembeli INNER JOIN produk ON proses_mining_pembeli.id_produk = produk.id_produk ORDER BY produk.id_produk";
  db.query(r, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/proses_mining_50", (req, res) => {
  const s = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 50";
  db.query(s, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/proses_mining_100", (req, res) => {
  const t = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk LIMIT 100";
  db.query(t, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/proses_mining_all", (req, res) => {
  const u = "SELECT * FROM proses_mining INNER JOIN produk ON proses_mining.id_produk = produk.id_produk ORDER BY produk.id_produk";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/kategori", (req, res) => {
  const u = "SELECT * FROM `kategori`";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/kategori/:id", (req, res) => {
  const u = "SELECT id_kategori FROM `kategori` as id";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/produk", (req, res) => {
  const insertproduct = "SELECT * FROM `produk` ";
  db.query(insertproduct, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });

});
app.get("/productdesc/:id", (req, res) => {
  const id_produk = req.params.id;
  const insertproduct = "SELECT * FROM `productdesc` WHERE id_produk = ?";
  db.query(insertproduct, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    }
    else {
      console.log(data);
      return res.json(data);
    }
  });
});
app.get("/produkpictureid/:id", (req, res) => {
  const id_produk = req.params.id;
  const r = "SELECT * FROM `produk` WHERE id_produk = ?";
  db.query(r, [id_produk], (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else {
      return res.json(data);
    }
  });

});
app.get("/customerhistory", (req, res) => {
  const insertproduct = "SELECT * FROM `customerhistory` ";
  db.query(insertproduct, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/produk/:id", (req, res) => {
  const id_produk = req.params.id; // get the id parameter from the request
  const u = "SELECT * FROM `produk` WHERE id_produk = ?";
  db.query(u, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    }
    else {
      console.log(data);
      return res.json(data);
    }
  });
});
app.get("/editpenjualan/:id", (req, res) => {
  const id_produk = req.params.id; // get the id parameter from the request
  const u = "SELECT * FROM `penjualan` WHERE id_produk = ?";
  db.query(u, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    }
    else {
      console.log(data);
      return res.json(data);
    }
  });
});

app.get('/deletepenjualan/:id', (req, res) => {
  const id_produk = req.params.id; // get the id parameter from the request
  const u = "DELETE FROM `penjualan` WHERE id_produk = ?";
  try {
    db.query(u, [id_produk], (err, data) => {
      if (err) {
        console.log(err);
        return res.json({ error: err.sqlMessage });
      } else {
        console.log(data);
      }
    });
  } catch (err) {
    console.log(err);
    return res.json({ error: err.message });
  }
});
app.get('/deleteproduk/:id', (req, res) => {
  const id_produk = req.params.id;
  const deleteproduk = "DELETE FROM `produk` WHERE id_produk = ?";
  db.query(deleteproduk, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    } else {
      console.log(data);
    }
  }
  );
  return res.json({ message: 'Data deleted successfully' });
});

app.get('/deletemining/:id', (req, res) => {
  const id_produk = req.params.id; // get the id parameter from the request
  const deletemining = "DELETE FROM `proses_mining` WHERE id_produk = ?";
  db.query(deletemining, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    } else {
      console.log(data);
    }
  }
  );
  return res.json({ message: 'Data deleted successfully' });
});
app.get('/deletedesc/:id', (req, res) => {
  const id_produk = req.params.id; // get the id parameter from the request
  const deletedesc = "DELETE FROM `productdesc` WHERE id_produk = ?";
  db.query(deletedesc, [id_produk], (err, data) => {
    if (err) {
      console.log(err);
      return res.json({ error: err.sqlMessage });
    } else {
      console.log(data);
    }
  }
  );
  return res.json({ message: 'Data deleted successfully' });
});

app.post('/update-data', (req, res) => {
  const { id_produk, nama, id_kategori, stok, harga } = req.body;
  const query = `UPDATE produk SET nama=?, id_kategori=?, stok=?, harga=? WHERE id_produk=?`;
  const values = [nama, id_kategori, stok, harga, id_produk];
  db.query(query, values, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      console.log(result.affectedRows + ' record(s) updated');
      res.send('Data updated successfully');
    }
  });
});
app.post('/update-data-penjualan', (req, res) => {
  const { id_produk, JAN, FEB, MAR, APR, MEI, JUN, JUL, AGUST, SEPT, OKT, NOV, DES } = req.body;
  const values = [
    parseInt(JAN),
    parseInt(FEB),
    parseInt(MAR),
    parseInt(APR),
    parseInt(MEI),
    parseInt(JUN),
    parseInt(JUL),
    parseInt(AGUST),
    parseInt(SEPT),
    parseInt(OKT),
    parseInt(NOV),
    parseInt(DES)
  ];

  const total = values.reduce((acc, val) => acc + val, 0);
  console.log(total);

  const valuessubmit = [
    ...values,
    total,
    id_produk,
  ];

  const query = `UPDATE penjualan SET JAN=?, FEB=?, MAR=?, APR=?, MEI=?, JUN=?, JUL=?, AGUST=?, SEPT=?, OKT=?, NOV=?, DES=?, total=? WHERE id_produk=?`;

  db.query(query, valuessubmit, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      console.log(result.affectedRows + ' record(s) updated');
      res.send('Data updated successfully');
    }
  });
});

app.post('/update-data-mining', (req, res) => {
  const { id_produk, JAN, FEB, MAR, APR, MEI, JUN, JUL, AGUST, SEPT, OKT, NOV, DES } = req.body;
  const query = `UPDATE proses_mining SET JAN=?, FEB=?, MAR=?, APR=?, MEI=?, JUN=?, JUL=?, AGUST=?, SEPT=?, OKT=?, NOV=?, DES=? WHERE id_produk=?`;
  const values = [JAN, FEB, MAR, APR, MEI, JUN, JUL, AGUST, SEPT, OKT, NOV, DES, id_produk];
  db.query(query, values, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      console.log(result.affectedRows + ' record(s) updated');
      res.send('Data updated successfully');
    }
  });
});

app.post('/updatequantity', (req, res) => {
  const { idcustomer } = req.body;
  const { quantity } = req.body;
  const { idproduct } = req.body;
  const ids = idproduct.map((id) => id);
  const placeholders = idproduct.map(() => '?').join(', ');
  const queryUpdateStok = `UPDATE produk SET stok = stok - ${quantity} WHERE id_produk IN (${placeholders})`;
  db.query(queryUpdateStok, ids, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      console.log(result.affectedRows + ' record(s) updated');
      const currentDate = new Date();
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGUST', 'SEPT', 'OKT', 'NOV', 'DES'];
      const currentMonth = months[currentDate.getMonth()];
      const querypenjualan = `UPDATE penjualan SET ${currentMonth} = ${currentMonth} + ${quantity}, total = total + ${quantity} WHERE id_produk IN (${placeholders})`;
      db.query(querypenjualan, ids, (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error updating data');
        } else {
          console.log(result.affectedRows + ' record(s) updated');
          const currentDate = new Date();
          const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGUST', 'SEPT', 'OKT', 'NOV', 'DES'];
          const currentMonth = months[currentDate.getMonth()];

          const querycustomer = `UPDATE customerhistory SET ${currentMonth} = ${currentMonth} + ${quantity}, total = total + ${quantity} WHERE id = ${idcustomer}`;

          db.query(querycustomer, (err) => {
            if (err) {
              console.error(err);
              console.log('error!', err);
            } else {
              res.status(200).send('Data updated successfully');
            }
          });
        }
      });
    }
  });
});

app.get("/cartcustomer", (req, res) => {
  const u = "SELECT * FROM `cartcustomer`";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/getcartmember/:id", (req, res) => {
  const idcust = req.params.id;
  const u = "SELECT * FROM `cartcustomer` WHERE idcustomer = ?";
  db.query(u, idcust, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/updatestatuscustomer/:id", (req, res) => {
  const idcustomer = req.params.id;
  const value = ["Sudah Dikonfirmasi", idcustomer];
  const u = "UPDATE cartcustomer SET status=? WHERE idcustomer=?";
  db.query(u, value, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/updatecartcustomer", (req, res) => {
  const u = "UPDATE `cartcustomer` SET status=? WHERE idcustomer=?";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});

app.get("/penjualan", (req, res) => {
  const u = "SELECT * FROM `penjualan`";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/penjualan/:id", (req, res) => {
  const u = "SELECT id_penjualan FROM `penjualan` as id";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/kmeanstemp/", (req, res) => {
  const u = "SELECT id_produk,JAN,FEB,MAR,APR,MEI,JUN,JUL,AGUST,SEPT,OKT,NOV,DES FROM `penjualan`";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});
app.get("/categorylist", (req, res) => {
  const u = "SELECT DISTINCT id_kategori FROM produk";
  db.query(u, (err, data) => {
    console.log(err, data);
    if (err) return res.json({ error: err.sqlMessage });
    else return res.json(data);
  });
});


app.post('/registerusers', async (req, res) => {
  const { email, nama, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query('INSERT INTO customer (email, nama, password) VALUES (?, ?, ?)', [email, nama, hashedPassword], (error) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error registering user');
    } else {
      console.log('User registered successfully : ', nama)
      res.sendStatus(200);
      db.query('INSERT INTO customerhistory (id, nama) VALUES (?, ?)', ['', nama], (error) => {
        if (error) {
          console.error(error);
          res.status(500).send('Error registering user');
        } else {
          console.log('User For Customer Cluster Registered! : ', nama)
        }
      })
    }
  });
});

app.post('/loginmember', (req, res) => {
  const { email, password } = req.body;

  // Find the user in the database
  db.query('SELECT * FROM customer WHERE email = ?', [email], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error logging in');
    } else if (results.length === 0) {
      res.status(401).send('Invalid email or password');
    } else {
      const user = results[0];

      // Compare the provided password with the hashed password stored in the database
      const isPasswordValid = bcrypt.compareSync(password, user.password);

      if (!isPasswordValid) {
        res.status(401).send('Invalid username or password');
      } else {
        const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1h' });

        // Set the token as a client-side cookie
        res.cookie('token', token, {
          maxAge: 3600000, // Cookie expiration time in milliseconds
          sameSite: 'strict', // Only allow cookies to be sent with same-site requests
          path: '/', // Specify the path where the cookie is valid
        });
        res.send({ token });
        console.log('Token extracted:', token);
        console.log('Welcome:', user.nama);
      }
    }
  });
});

// Protected route
app.get('/statustoken', (req, res) => {
  const cookies = req.headers.cookie;
  const parsedCookies = cookies ? cookie.parse(cookies) : {};
  const token = parsedCookies.token;
  console.log('token:', token);

  if (!token) {
    res.status(401).send('Unauthorized');
    console.log('Error! AUTH: Token is missing');
  } else {
    try {
      // Verify the JWT to ensure that it is valid and has not expired
      const decodedToken = jwt.verify(token, 'secret');
      res.send({ id: decodedToken.id });
      console.log('Decoded Token:', decodedToken.id);
    } catch (error) {
      res.status(401).send('Unauthorized');
      console.log('Error! AUTH:', error);
    }
  }
});

app.get('/usermember/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM customer WHERE id = ?', [id], (error, results) => {
    if (error) {
      console.error(error);
      console.log(error);
      res.status(500).send('Internal Server Error');
    } else if (results.length === 0) {
      res.status(404).send('User not found');
      console.log(error);
    } else {
      const user = results[0];
      res.send({ nama: user.nama });
      console.log('Success Fetch Data : ', user.nama);
    }
  });
});
app.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('user', { path: '/' });

  res.sendStatus(200);
});

app.get('/kmeans_process', (req, res) => {

  db.query(`CREATE TABLE IF NOT EXISTS proses_mining_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produk INT,
  cluster INT,
  iterations INT,
  distance FLOAT
)`, (err) => {
    if (err) {
      console.error('Error creating proses_mining table:', err);
    }
  });

  db.query(`CREATE TABLE IF NOT EXISTS centroids_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_produk INT,
  coordinate1 FLOAT,
  coordinate2 FLOAT
)`, (err) => {
    if (err) {
      console.error('Error creating centroids table:', err);
    }
  });

  const k = 2; // Number of clusters
  const maxIterations = 2; // Maximum number of iterations

  // Step 1: Retrieve data from the tables
  const query = `
  SELECT p.stok, SUM(pen.JAN + pen.FEB + pen.MAR + pen.APR + pen.MEI + pen.JUN + pen.JUL + pen.AGUST + pen.SEPT + pen.OKT + pen.NOV + pen.DES) AS total
  FROM produk p
  JOIN penjualan pen ON p.id_produk = pen.id_produk
  GROUP BY p.id_produk
`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving data:', err);
      return;
    }
    function initializeCentroids(data, k) {
      const centroids = [];
      const dataCopy = [...data];
      const shuffledData = shuffleArray(dataCopy);
      for (let i = 0; i < k; i++) {
        centroids.push(shuffledData[i]);
      }
      return centroids;
    }

    // Function to shuffle an array randomly
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    function assignDataToClusters(data, centroids) {
      const clusterAssignments = [];

      for (const point of data) {
        let minDistance = Infinity;
        let clusterIndex = -1;

        for (let i = 0; i < centroids.length; i++) {
          const centroid = centroids[i];
          const distance = calculateDistance(point, centroid);

          if (distance < minDistance) {
            minDistance = distance;
            clusterIndex = i;
          }
        }

        clusterAssignments.push(clusterIndex);
      }

      return clusterAssignments;
    }
    function calculateDistance(point, centroid) {
      const [M_1x, M_1y] = point;
      const [C_1x, C_1y] = centroid;

      // Calculate the distance between the points using Euclidean distance formula
      return Math.sqrt(Math.pow(M_1x - C_1x, 2) + Math.pow(M_1y - C_1y, 2));
    }

    function updateCentroids(data, clusterAssignments, k) {
      const newCentroids = Array.from({ length: k }, () => [0, 0]);
      const clusterCounts = Array.from({ length: k }, () => 0);

      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        const clusterIndex = clusterAssignments[i];

        newCentroids[clusterIndex][0] += point[0];
        newCentroids[clusterIndex][1] += point[1];
        clusterCounts[clusterIndex]++;
      }

      for (let i = 0; i < k; i++) {
        newCentroids[i][0] /= clusterCounts[i];
        newCentroids[i][1] /= clusterCounts[i];
      }

      return newCentroids;
    }

    function checkConvergence(centroids, newCentroids) {
      const convergenceThreshold = 0.001;

      for (let i = 0; i < centroids.length; i++) {
        const centroid = centroids[i];
        const newCentroid = newCentroids[i];
        if (calculateDistance(centroid, newCentroid) > convergenceThreshold) {
          return false;
        }
      }

      return true;
    }
    function storeCentroids(centroids) {
      db.query('TRUNCATE TABLE centroids_new', (err) => {
        if (err) {
          console.error('Error truncating centroids_new table:', err);
          return;
        }

        for (let i = 0; i < centroids.length; i++) {
          const centroid = centroids[i];
          const idProduk = i + 1;
          const coordinate1 = centroid[0];
          const coordinate2 = centroid[1];

          const query = `INSERT INTO centroids_new (id_produk, coordinate1, coordinate2)
                       VALUES (${idProduk}, ${coordinate1}, ${coordinate2})`;

          db.query(query, (err) => {
            if (err) {
              console.error('Error storing centroids:', err);
            } else {
              console.log('Successfully stored centroid');
            }
          });
        }
      });
    }
    // Extract stok and total from the results
    const data = results.map(row => [row.stok, row.total]);

    // Step 2: Initialize centroids randomly
    let centroids = initializeCentroids(data, k);
    console.log('centroids', centroids);
    let iterations = 0;
    let isConverged = false;
    let clusterAssignments = [];
    let distances = [];

    while (!isConverged && iterations < maxIterations) {
      clusterAssignments = assignDataToClusters(data, centroids);
      const newCentroids = updateCentroids(data, clusterAssignments, k);
      isConverged = checkConvergence(centroids, newCentroids);
      centroids = newCentroids;
      console.log('clusterAssigned', clusterAssignments);
      iterations++;

      // Calculate distances for the current iteration
      distances = data.map((point, i) => calculateDistance(point, centroids[clusterAssignments[i]]));

      // Store the results for the current iteration
      storeResults(data, clusterAssignments, centroids, distances, iterations);
    }

    storeCentroids(centroids);

    console.log('storeResult', storeResults);
  });

  // ...

  function storeResults(data, clusterAssignments, distances) {
    // Fetch id_produk values from the produk table
    const idProdukQuery = `SELECT id_produk FROM produk`;
    db.query(idProdukQuery, (err, idProdukResults) => {
      if (err) {
        console.error('Error fetching id_produk:', err);
        return;
      }

      // Map the id_produk values to an array
      const idProdukArray = idProdukResults.map(row => row.id_produk);
      let productsWithManyBuyers = [];
      let productsWithFewBuyers = [];

      // Insert the results into the proses_mining_new table
      for (let i = 0; i < clusterAssignments.length; i++) {
        const cluster = clusterAssignments[i];
        const product = data[i];

        if (cluster === 0) {
          productsWithManyBuyers.push([idProdukArray[i], ...product]);
        } else {
          productsWithFewBuyers.push([idProdukArray[i], ...product]);

        }


        const distance = distances[i];
        console.log('distance', distance);
        console.log('data', data[i]);
        console.log('cluster', cluster);

      }
    });
  }
  res.sendStatus(200);
});

app.get('/kmeans_test', (req, res) => {
  // Fetch data from database
  const query = `
    SELECT p.id_produk, p.nama, p.stok, SUM(j.total) AS total
    FROM produk p
    INNER JOIN penjualan j ON p.id_produk = j.id_produk
    GROUP BY p.id_produk, p.nama, p.stok
  `;

  db.query(query, (err, results) => {
    if (err) throw err;

    // Perform K-means clustering
    const k = 2; // Number of clusters
    let iterations = 0;
    let clusters = []; // Declare clusters variable outside the loop
    let centroidHistory = []; // Array to store centroid coordinates for each iteration

    // Initialize centroids C1 and C2 randomly
    let centroids = [];
    let clusterLabelManyBuyers;
    let clusterLabelFewBuyers;
    let distances = []; // Array to store distances for each iteration

    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * results.length);
      const { total, stok } = results[randomIndex];
      const centroid = {
        total,
        stok
      };
      centroids.push(centroid);
    }

    // Push currentDistances to distances

    while (iterations < 2) {
      iterations++;
      clusters = []; // Reset clusters at the start of each iteration

      // Assign each data point to the nearest centroid
      for (let i = 0; i < k; i++) {
        clusters.push([]);
      }

      for (const data of results) {
        let minDistance = Infinity;
        let clusterIndex = 0;
        let distance;

        for (let i = 0; i < k; i++) {
          distance = Math.sqrt(Math.pow(data.total - centroids[i].total, 2) + Math.pow(data.stok - centroids[i].stok, 2));

          if (distance < minDistance) {
            minDistance = distance;
            clusterIndex = i;
          }
        }

        clusters[clusterIndex].push({
          data,
          distance
        });
      }

      for (let i = 0; i < k; i++) {
        const cluster = clusters[i];

        if (cluster.length > 0) {
          const totalSum = cluster.reduce((sum, { data }) => sum + data.total, 0);
          const stokSum = cluster.reduce((sum, { data }) => sum + data.stok, 0);

          centroids[i] = {
            total: totalSum / cluster.length,
            stok: stokSum / cluster.length
          };
        }
      }

      if (clusters[0].length > 0) {
        clusterLabelManyBuyers = "Produk Dengan Pembeli Sedikit Menurut Centroid"; // Assign label for C1 cluster
        console.log(clusterLabelManyBuyers);
        console.log(clusters[0]);
      }

      if (clusters[1].length > 0) {
        clusterLabelFewBuyers = "Produk Dengan Pembeli Terbanyak Menurut Centroid"; // Assign label for C2 cluster
        console.log(clusterLabelFewBuyers);
        console.log(clusters[1]);
      }

      // Store the centroid coordinates for this iteration
      const centroidCoordinates = centroids.map(centroid => ({ total: centroid.total, stok: centroid.stok }));
      centroidHistory.push(centroidCoordinates);

      // Calculate and store the distances for this iteration
      const iterationDistances = clusters.map((cluster) => {
        return cluster.map(({ data, distance }) => ({
          nama: data.nama,
          cluster: `${data.total}; ${data.stok}`,
          distance,
          label: cluster === clusters[0] ? clusterLabelManyBuyers : clusterLabelFewBuyers,
          iteration: iterations // Add iteration number to the result
        }));
      });
      distances.push(iterationDistances);
    }

    const c1 = centroids[0];
    const c2 = centroids[1];
    const iterationsData = distances.length;
    console.log("Iterations:", iterationsData);
    console.log("C1:", c1);
    console.log("C2:", c2);

    const newTableName2 = `centroid_history_${iterations}`; // Choose a suitable name for the new table
    const createTableQuery2 = `
      CREATE TABLE IF NOT EXISTS ${newTableName2} (
        id INT PRIMARY KEY AUTO_INCREMENT,
        total FLOAT,
        stok FLOAT,
        iteration INT
      )
    `;
    const truncateTableQuery2 = `TRUNCATE TABLE ${newTableName2}`;
    let insertQuery2 = `INSERT INTO ${newTableName2} (total, stok, iteration) VALUES `;
    const values2 = [];
    centroidHistory.forEach((iterationCentroids, iteration) => { // Iterate over centroidHistory and capture the iteration index
      iterationCentroids.forEach(({ total, stok }) => {
        values2.push(`(${total}, ${stok}, ${iteration + 1})`); // Add 1 to the iteration index to start from 1 instead of 0
      });
    });
    insertQuery2 += values2.join(', ');


    const newTableName = 'kmeans_results'; // Choose a suitable name for the new table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${newTableName} (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama VARCHAR(255),
        cluster VARCHAR(255),
        distance FLOAT,
        label VARCHAR(255),
        iteration INT
      )
    `;
    const truncateTableQuery = `TRUNCATE TABLE ${newTableName}`;
    let insertQuery = `INSERT INTO ${newTableName} (nama, cluster, distance, label, iteration) VALUES `;
    const values = [];
    distances.forEach((iterationDistances) => { // Iterate over distances and capture the iteration index
      iterationDistances.forEach(clusterDistances => {
        clusterDistances.forEach(({ nama, cluster, distance, label, iteration: iter }) => { // Access the iteration value from the result
          values.push(`('${nama}', '${cluster}', ${distance}, '${label}', ${iter})`);
        });
      });
    });
    insertQuery += values.join(', ');

    // Execute the queries
    db.query(createTableQuery, (err) => {
      if (err) throw err;
      db.query(truncateTableQuery, (err) => {
        if (err) throw err;
        db.query(insertQuery, (err) => {
          if (err) throw err;
          db.query(createTableQuery2, (err) => {
            if (err) throw err;
            db.query(truncateTableQuery2, (err) => {
              if (err) throw err;
              db.query(insertQuery2, (err) => {
                if (err) throw err;
                if (iterations === 2) {
                  res.json({ distances, centroidHistory });
                }
              })
            })
          });
        });
      });
    });
  });
});

app.get('/labelPercentage', (req, res) => {
  const query = 'SELECT COUNT(*) AS count, label FROM kmeans_results GROUP BY label';
  db.query(query, (err, results) => {
    if (err) throw err;

    // Calculate the total count
    const totalCount = results.reduce((acc, curr) => acc + curr.count, 0);

    // Create an object to store the label percentages with renamed keys
    const labelPercentages = {};

    // Calculate the percentage for each label and store it in the object with renamed keys
    results.forEach((row, index) => {
      const key = `c${index + 1}`;
      labelPercentages[key] = ((row.count / totalCount) * 100).toFixed(2);
    });

    res.json(labelPercentages);
  });
});

app.get('/fewbuyersdata', (req, res) => {
  const query = 'SELECT * FROM `kmeans_results` WHERE label = "Produk Dengan Pembeli Sedikit Menurut Centroid" AND iteration != "2" ORDER BY `label` ASC';
  db.query(query, (err, results) => {
    if (err) throw err;

    // Calculate the total count


    res.json(results);
  });
});

app.get('/manybuyersdata', (req, res) => {
  const query = 'SELECT * FROM `kmeans_results` WHERE label = "Produk Dengan Pembeli Terbanyak Menurut Centroid" AND iteration != "2" ORDER BY `label` ASC';
  db.query(query, (err, results) => {
    if (err) throw err;

    // Calculate the total count


    res.json(results);
  });
});
// Route to perform K-means clustering
app.get('/kmeans123', (req, res) => {
  // Fetch data from the 'produk' and 'penjualan' tables
  db.query('SELECT p.*, j.total FROM produk p JOIN penjualan j ON p.id_produk = j.id_produk', (err, produkData) => {
    if (err) {
      console.error('Error fetching data from MySQL: ', err);
      res.status(500).send('Error fetching data from MySQL');
      return;
    }

    console.log('Data from MySQL:');
    console.log(produkData);

    // Perform K-means clustering
    let centroids = initializeCentroids(produkData); // Randomly initialize centroids
    let iterations = 0;
    let cluster1, cluster2;

    while (iterations < 10) { // Set the desired number of iterations
      cluster1 = [];
      cluster2 = [];

      // Assign data points to the nearest centroid
      for (const produk of produkData) {
        const distanceToCentroid1 = calculateDistance(produk, centroids[0]);
        const distanceToCentroid2 = calculateDistance(produk, centroids[1]);

        if (distanceToCentroid1 <= distanceToCentroid2) {
          cluster1.push(produk);
        } else {
          cluster2.push(produk);
        }
      }

      // Recalculate centroids based on the assigned data points
      const newCentroids = [
        calculateCentroid(cluster1),
        calculateCentroid(cluster2),
      ];

      // Check if the centroids have converged
      if (centroidsAreEqual(centroids, newCentroids)) {
        break;
      }

      centroids = newCentroids;
      iterations++;
      res.json({ cluster1, cluster2 });
    }
// Helper function to randomly initialize centroids
function initializeCentroids(data) {
  const centroid1 = data[Math.floor(Math.random() * data.length)];
  const centroid2 = data[Math.floor(Math.random() * data.length)];

  return [centroid1, centroid2];
}

// Helper function to calculate the Euclidean distance between two points
function calculateDistance(point1, point2) {
  const xDiff = point1.stok - point2.stok;
  const yDiff = point1.total - point2.total;

  return Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
}

// Helper function to calculate the centroid of a cluster
function calculateCentroid(cluster) {
  let totalStok = 0;
  let totalTotal = 0;

  for (const point of cluster) {
    totalStok += point.stok;
    totalTotal += point.total;
  }

  const centroid = {
    stok: totalStok / cluster.length,
    total: totalTotal / cluster.length,
  };

  return centroid;
}

// Helper function to check if two sets of centroids are equal
function centroidsAreEqual(centroids1, centroids2) {
  return (
    centroids1[0].stok === centroids2[0].stok &&
    centroids1[0].total === centroids2[0].total &&
    centroids1[1].stok === centroids2[1].stok &&
    centroids1[1].total === centroids2[1].total
  );
}
    console.log('Clustering result:');
    console.log('Cluster 1:', cluster1);
    console.log('Cluster 2:', cluster2);

    // Display the result

  });
});
