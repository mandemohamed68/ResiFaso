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
  const residences = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      created_at as createdAt 
    FROM residences
  `);
  for (const res of residences) {
    const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [res.id]);
    res.amenities = amenities.map((a: any) => a.amenity);
    const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [res.id]);
    res.images = images.map((i: any) => i.image_url);
    // Reconstruct the address and utilities Included objects for frontend components that still use them
    res.address = {
      city: res.city,
      neighborhood: res.neighborhood,
      street: res.street
    };
    res.utilitiesIncluded = { water: true, electricity: true }; // Mocking as it's not saved in DB schema
  }
  return residences;
};

export const getResidenceById = async (id: string) => {
  const res = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      created_at as createdAt 
    FROM residences WHERE id = ?`, [id]);
  if (!res[0]) return null;
  const residence = res[0];
  const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [id]);
  residence.amenities = amenities.map((a: any) => a.amenity);
  const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [id]);
  residence.images = images.map((i: any) => i.image_url);
  residence.address = {
    city: residence.city,
    neighborhood: residence.neighborhood,
    street: residence.street
  };
  residence.utilitiesIncluded = { water: true, electricity: true };
  return residence;
};

// Settings
export const getSettings = async (key: string) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  return results.length > 0 ? JSON.parse(results[0].value) : {};
};

export const saveSettings = async (key: string, value: any) => {
  const dbType = process.env.DB_TYPE || 'sqlite';
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

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const updateResidence = async (id: string, updates: any) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = updates;
  
  const mappedUpdates: any = {};
  for (const [k, v] of Object.entries(rest)) {
    mappedUpdates[toSnakeCase(k)] = v;
  }
  if (address) {
    mappedUpdates.city = address.city;
    mappedUpdates.neighborhood = address.neighborhood;
    mappedUpdates.street = address.street;
  }

  const fields = Object.keys(mappedUpdates);
  if (fields.length > 0) {
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = Object.values(mappedUpdates);
    await executeSql(`UPDATE residences SET ${setClause} WHERE id = ?`, [...values, id]);
  }

  if (amenities) {
    await executeSql("DELETE FROM residence_amenities WHERE residence_id = ?", [id]);
    for (const a of amenities) {
      await executeSql("INSERT INTO residence_amenities (residence_id, amenity) VALUES (?, ?)", [id, a]);
    }
  }
  if (images) {
    await executeSql("DELETE FROM residence_images WHERE residence_id = ?", [id]);
    for (const img of images) {
      await executeSql("INSERT INTO residence_images (residence_id, image_url) VALUES (?, ?)", [id, img]);
    }
  }
};

export const createResidence = async (res: any) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = res;
  
  const mappedObj: any = {};
  for (const [k, v] of Object.entries(rest)) {
    mappedObj[toSnakeCase(k)] = v;
  }
  if (address) {
    mappedObj.city = address.city;
    mappedObj.neighborhood = address.neighborhood;
    mappedObj.street = address.street;
  }

  const fields = Object.keys(mappedObj);
  const placeholders = fields.map(() => '?').join(', ');
  await executeSql(`INSERT INTO residences (${fields.join(', ')}) VALUES (${placeholders})`, Object.values(mappedObj));
  
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
