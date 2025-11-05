import db from "./models/index.js";
const {User} = db

db.sequelize.sync();
User.findAll().then(console.log("hello"))