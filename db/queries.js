const pool = require('./pool')

const insertUser = async (firstName, lastName, username, password) => {
    await pool.query("INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4)", [firstName, lastName, username, password])
}

const getUserByUsername = async (username) => {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username])
    console.log(rows)
    return rows[0]
}

const getUserById = async (id) => {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id])
    return rows[0]
}

const getSecretKey = async () => {
    const { rows } = await pool.query("SELECT * FROM credentials")
    // console.log(rows)
    return rows[0]
}

const getMembershipStatus = async (username) => {
    const { rows } = await pool.query("SELECT membership_status FROM users WHERE username = $1", [username])
    // console.log(rows);
    return rows[0];
}

const setMembershipStatus = async (username) => {
    await pool.query("UPDATE users SET membership_status = true WHERE username = $1", [username]);
}

const insertMessage = async (title, message, created_at, user_id) => {
    await pool.query("INSERT INTO messages (title, text, created_at, user_id) VALUES($1, $2, $3, $4)", [title, message, created_at, user_id])
}

const getMessages = async () => {
   const { rows } = await pool.query("SELECT * FROM messages")
   return rows
}

module.exports = {
    insertUser,
    getUserByUsername,
    getUserById,
    getSecretKey,
    getMembershipStatus,
    setMembershipStatus,
    insertMessage,
    getMessages,
}