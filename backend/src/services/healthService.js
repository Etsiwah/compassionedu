'use strict';

const pool = require('../db/pool');

class HealthService {
  /**
   * Upload a new health record
   */
  async uploadRecord(studentId, { record_type, file_url, description }) {
    const query = `
      INSERT INTO student_health_records (student_id, record_type, file_url, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [studentId, record_type, file_url, description]);
    return rows[0];
  }

  /**
   * Get all health records for a specific student
   */
  async getStudentRecords(studentId) {
    const query = `
      SELECT * FROM student_health_records
      WHERE student_id = $1
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [studentId]);
    return rows;
  }

  /**
   * Delete a pending health record
   */
  async deleteRecord(recordId, studentId) {
    const query = `
      DELETE FROM student_health_records
      WHERE id = $1 AND student_id = $2 AND status = 'pending'
      RETURNING id, file_url
    `;
    const { rows } = await pool.query(query, [recordId, studentId]);
    if (rows.length === 0) {
      throw new Error('Record not found or cannot be deleted');
    }
    return rows[0];
  }

  /**
   * Get all health records (for admin)
   */
  async getAllRecords({ status, limit = 100, offset = 0 }) {
    let query = `
      SELECT h.*, u.name as student_name, u.email as student_email,
             sp.level, sp.program
      FROM student_health_records h
      JOIN users u ON h.student_id = u.id
      LEFT JOIN student_profiles sp ON h.student_id = sp.user_id
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE h.status = $${params.length}`;
    }

    query += ` ORDER BY h.created_at DESC`;

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    return rows;
  }

  /**
   * Review a health record (for admin)
   */
  async reviewRecord(recordId, { status, admin_notes }) {
    const query = `
      UPDATE student_health_records
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, admin_notes, recordId]);
    if (rows.length === 0) {
      throw new Error('Record not found');
    }
    return rows[0];
  }
}

module.exports = new HealthService();
