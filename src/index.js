const db = require("./models");

const {User} = db

db.sequelize.sync();
User.findAll().then(console.log("hello"))