require("dotenv").config();

const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const File = require("./models/file");

const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);

app.set("view engine", "ejs");

app.get("/", (request, response) => {
  response.render("index");
});

app.post("/upload", upload.single("file"), async (request, response) => {
  const fileData = {
    path: request.file.path,
    originalName: request.file.originalname,
  };
  if (request.body.password != null && request.body.password != "") {
    fileData.password = await bcrypt.hash(request.body.password, 10);
  }

  const file = await File.create(fileData);

  response.render("index", {
    fileLink: `${request.headers.origin}/file/${file.id}`,
  });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(request, response) {
  const file = await File.findById(request.params.id);

  if (file.password != null) {
    if (request.body.password == null) {
      response.render("password");
      return;
    }

    if (!(await bcrypt.compare(request.body.password, file.password))) {
      response.render("password", { error: true });
      return;
    }
  }

  file.downloadCount += 1;
  await file.save();
  console.log(file.downloadCount);

  response.download(file.path, file.originalName);
}

app.listen(process.env.PORT);