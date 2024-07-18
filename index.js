import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import pg from "pg";
import { config } from 'dotenv';

config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const db = new pg.Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    database: process.env.DATABASE,
    port: process.env.PORT
});

db.connect();

app.get('/', (req, res) => {
    res.render("login.ejs");
});

app.get('/home', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM bookinfo');
        res.render("index.ejs", { content: results.rows, date: formattedDate() });
    } catch (error) {
        console.error("Failed to retrieve data:", error.message);
        res.redirect('/db'); // Redirect to db route if no data is available
    }
});
app.get('/create',(req,res)=>{
    res.render("db.ejs")
})

app.get('/db', async (req, res) => {
    res.render("db.ejs");
});

app.post('/db', async (req, res) => {
    try {
        let { bookname, notes } = req.body;
        const response = await axios.get(`https://openlibrary.org/search.json?q=${bookname}`);
        const isbn = response.data.docs[0].cover_edition_key;
        const title = response.data.docs[0].title;
        const authname = response.data.docs[0].author_name[0];

        await db.query(`INSERT INTO bookinfo (name, isbn, title, review, author) VALUES ($1, $2, $3, $4, $5)`, [bookname, isbn, title, notes, authname]);

        res.redirect('/home');
    } catch (error) {
        console.error("Failed to insert data:", error.message);
    }
});

app.get('/book/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM bookinfo WHERE id = $1', [id]);
        res.render('book.ejs', { book: result.rows[0] });
    } catch (error) {
        console.error("Failed to retrieve book details:", error.message);
    }
});

app.post('/book/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM bookinfo WHERE id = $1', [id]);
        res.redirect('/home');
    } catch (error) {
        console.error("Failed to delete book:", error.message);
    }
});

app.get('/book/:id/update', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM bookinfo WHERE id = $1', [id]);
        res.render('update.ejs', { book: result.rows[0] });
    } catch (error) {
        console.error("Failed to retrieve book details for update:", error.message);
    }
});

app.post('/book/:id/update', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isbn, title, review, author } = req.body;
        await db.query('UPDATE bookinfo SET name = $1, isbn = $2, title = $3, review = $4, author = $5 WHERE id = $6', [name, isbn, title, review, author, id]);
        res.redirect(`/home`);
    } catch (error) {
        console.error("Failed to update book:", error.message);
    }
});

app.listen(port, () => {
    console.log(`Your Port is successfully running on ${port}`);
});

let formattedDate = () => {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const formattedDay = day < 10 ? '0' + day : day;
    const formattedMonth = month < 10 ? '0' + month : month;

    return year + '-' + formattedMonth + '-' + formattedDay;
}
