import 'dotenv/config';
import { pool } from './db-server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const db = {
  // Fonction utilitaire pour exécuter une requête
  query: async (sql: string, params?: any[]) => {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
  },

  // 1. Authentification
  auth: {
    register: async (email: string, passwordHash: string, displayName: string, role: string = 'client') => {
      const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      await pool.execute(
        'INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
        [id, email, passwordHash, displayName, role]
      );
      return id;
    },
    login: async (email: string) => {
      const [rows]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0];
    }
  },

  // 2. Résidences
  residences: {
    getAll: async () => {
      const [rows] = await pool.execute('SELECT * FROM residences WHERE status = "published"');
      return rows;
    },
    getById: async (id: string) => {
      const [rows]: any = await pool.execute('SELECT * FROM residences WHERE id = ?', [id]);
      return rows[0];
    },
    create: async (residence: any) => {
      const id = 'res_' + Date.now().toString(36);
      await pool.execute(
        `INSERT INTO residences (id, owner_id, title, description, type, price_per_night, city) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, residence.ownerId, residence.title, residence.description, residence.type, residence.price_per_night, residence.city]
      );
      return id;
    }
  },

  // 3. Réservations
  bookings: {
    create: async (booking: any) => {
      const id = 'bk_' + Date.now().toString(36);
      await pool.execute(
        `INSERT INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, total_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, booking.residenceId, booking.clientId, booking.ownerId, booking.checkIn, booking.checkOut, booking.totalPrice]
      );
      return id;
    },
    getByClientId: async (clientId: string) => {
      const [rows] = await pool.execute('SELECT * FROM bookings WHERE client_id = ?', [clientId]);
      return rows;
    }
  }
};

export default db;
