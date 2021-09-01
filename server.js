const express = require("express");
const app = express();
const parseXlsx = require("excel");
const path = require("path");
const fs = require("fs");
const readXlsxFile = require("read-excel-file/node");
const mongoose = require("mongoose");
const User = require("./models/user");
var validator = require("validator");

const mongoURI =
	"mongodb+srv://admin:admin@cluster0.lvk86.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true });

mongoose.connection.once("open", () => {
	console.log("database connected");
});

mongoose.connection.on("error", (err) => {
	console.log("database error", err);
});

// File path.
// readXlsxFile(path.join(__dirname, "empdata.xlsx")).then((rows) => {
//     // `rows` is an array of rows
//     // each row being an array of cells.
//     console.log(rows);
// });

const PORT = process.env.PORT || 3000;
const multer = require("multer");

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, __dirname + "/uploads/");
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + "-" + file.originalname);
	},
});
var upload = multer({
	storage: storage,
});

app.post("/excel", upload.single("excel"), async (req, res) => {
	try {
		const rows = await readXlsxFile(path.join(__dirname, "uploads", req.file.filename));
		// const rows = await readXlsxFile(path.join(__dirname, "empdata.xlsx"));

		// readXlsxFile(path.join(__dirname, "empdata.xlsx")).then(async (rows) => {
		// `rows` is an array of rows
		// each row being an array of cells.
		// console.log("row",rows);
		const columns = rows[0];

		rows.shift(); // removing the column row

		let rejectionCount = 0;
		let successfulInsertionCount = 0;

		for (let i = 0; i < rows.length; i++) {
			let validUser = await addUser(rows[i]);
			validUser ? ++successfulInsertionCount : ++rejectionCount;
		}
		console.log("done");
		console.log({ successfulInsertionCount, rejectionCount });

		res.send(`${successfulInsertionCount} rows inserted, ${rejectionCount} rows rejected`);

		fs.unlink(path.join(__dirname, "uploads", req.file.filename), () => {}); //removing temporary file
	} catch (err) {
		res.send("Something went wrong");
		console.log(err);
	}
});

app.listen(PORT, () => {
	console.log("Server running on", PORT);
});

const addUser = async (row) => {
	try {
		const name = row[0];
		const address = row[1];
		const empid = row[2];
		const designation = row[3];
		const email = row[4];
		const mobileno = row[5];

		if (!validator.isEmail(email) || !validator.isMobilePhone(mobileno.toString())) return false;

		let user = await User.findOne({ empid: empid });
		if (user) return false;

		const newUser = new User({
			name,
			address,
			empid,
			designation,
			email,
			mobileno,
		});

		let new_user = await newUser.save();

		return new_user ? true : false;
	} catch (err) {
		res.send("Something went wrong");
		console.log(err);
	}
};
