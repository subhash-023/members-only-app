const { Pool } = require('pg')
const pool = new Pool({
    connectionString: "postgres://subhash:w3dzd4d2@localhost:5432/members_only_db"
})

module.exports = pool