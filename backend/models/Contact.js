import { pool } from '../config/db.js';

function mapRow(row) {
  if (!row) return null;

  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    city: row.city,
    experience: row.experience,
    currentBusiness: row.current_business,
    type: row.type,
    createdAt: row.created_at
  };
}

async function create(data) {
  const {
    name,
    email,
    phone = null,
    subject = null,
    message,
    city = null,
    experience = null,
    currentBusiness = null,
    type = 'general'
  } = data;

  const result = await pool.query(
    `INSERT INTO contacts (name, email, phone, subject, message, city, experience, current_business, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [name, email, phone, subject, message, city, experience, currentBusiness, type]
  );

  return mapRow(result.rows[0]);
}

const Contact = { create };

export default Contact;
export { create };