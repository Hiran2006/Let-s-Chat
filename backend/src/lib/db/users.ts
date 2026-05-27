import { defaultMaxListeners } from "node:events";
import db from "./db.js";

const isEmailExist = (email: string) => {
  return new Promise((resolve, reject) => {
    db.get("select * from users where email=?", [email], (err, row) => {
      if (err) reject(err);
      else {
        if (row) resolve(true);
        else resolve(false);
      }
    });
  });
};

const createNewUser = async(email: string, password: string, name: string) => {
    return db.run("insert into users(name,email,password) values(?,?,?)", [
      name,
      email,
      password,
    ]);
};

export default { isEmailExist, createNewUser };
