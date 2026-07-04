import { executeSql } from './index';

// Users
export const getUserProfile = async (uid: string) => {
  const users = await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified, created_at as createdAt FROM users WHERE uid = ?", [uid]);
  return users[0] || null;
};

export const getAllUsers = async () => {
  return await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified, created_at as createdAt FROM users");
};

// Residences
export const getAllResidences = async () => {
  const residences = await executeSql("SELECT * FROM residences");
  for (const res of residences) {
    const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [res.id]);
    res.amenities = amenities.map((a: any) => a.amenity);
    const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [res.id]);
    res.images = images.map((i: any) => i.image_url);
  }
  return residences;
};

export const getResidenceById = async (id: string) => {
  const res = await executeSql("SELECT * FROM residences WHERE id = ?", [id]);
  if (!res[0]) return null;
  const residence = res[0];
  const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [id]);
  residence.amenities = amenities.map((a: any) => a.amenity);
  const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [id]);
  residence.images = images.map((i: any) => i.image_url);
  return residence;
};

// Settings
export const getSettings = async (key: string) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  return results.length > 0 ? JSON.parse(results[0].value) : {};
};

export const saveSettings = async (key: string, value: any) => {
  const dbType = process.env.DB_TYPE || 'firebase';
  if (dbType === 'mariadb') {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [key, JSON.stringify(value), JSON.stringify(value)]);
  } else {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET value = ?", [key, JSON.stringify(value), JSON.stringify(value)]);
  }
};

// Ads
export const getAllAds = async () => {
  return await executeSql("SELECT * FROM advertisements ORDER BY created_at DESC");
};

export const deleteResidence = async (id: string) => {
  await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [id]);
  await executeSql("DELETE FROM residences WHERE id = ?", [id]);
};

export const updateResidence = async (id: string, updates: any) => {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = Object.values(updates);
  await executeSql(`UPDATE residences SET ${setClause} WHERE id = ?`, [...values, id]);
};

export const createResidence = async (res: any) => {
  const { amenities, images, ...rest } = res;
  const fields = Object.keys(rest);
  const placeholders = fields.map(() => '?').join(', ');
  await executeSql(`INSERT INTO residences (${fields.join(', ')}) VALUES (${placeholders})`, Object.values(rest));
  
  if (amenities) {
    for (const a of amenities) {
      await executeSql("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [res.id, a]);
    }
  }
  if (images) {
    for (const img of images) {
      await executeSql("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [res.id, img]);
    }
  }
};

export const updateBookingStatus = async (id: string, updates: any) => {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  // Map JS camelCase to SQL snake_case if needed, but assuming server sends correct fields
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await executeSql(`UPDATE bookings SET ${setClause} WHERE id = ?`, [...Object.values(updates), id]);
};

export const updateUserProfile = async (uid: string, updates: any) => {
  const fields = Object.keys(updates);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await executeSql(`UPDATE users SET ${setClause} WHERE uid = ?`, [...Object.values(updates), uid]);
};
