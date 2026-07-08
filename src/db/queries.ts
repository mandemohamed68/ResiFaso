import { executeSql } from './index';

// Users
export const getUserProfile = async (uid: string) => {
  const users = await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified, created_at as createdAt FROM users WHERE uid = ?", [uid]);
  return users[0] || null;
};

export const getAllUsers = async () => {
  return await executeSql("SELECT uid, email, display_name as displayName, role, photo_url as photoUrl, is_verified as isVerified, created_at as createdAt FROM users ORDER BY created_at DESC");
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
      utilities_included as utilitiesIncludedRaw,
      created_at as createdAt 
    FROM residences
    ORDER BY created_at DESC
  `);

  if (residences.length === 0) return [];

  const allAmenities = await executeSql("SELECT residence_id, amenity FROM residence_amenities");
  const allImages = await executeSql("SELECT residence_id, image_url FROM residence_images");

  const amenitiesMap: Record<string, string[]> = {};
  allAmenities.forEach((a: any) => {
    if (!amenitiesMap[a.residence_id]) amenitiesMap[a.residence_id] = [];
    amenitiesMap[a.residence_id].push(a.amenity);
  });

  const imagesMap: Record<string, string[]> = {};
  allImages.forEach((i: any) => {
    if (!imagesMap[i.residence_id]) imagesMap[i.residence_id] = [];
    imagesMap[i.residence_id].push(i.image_url);
  });

  return residences.map((res: any) => ({
    ...res,
    amenities: amenitiesMap[res.id] || [],
    images: imagesMap[res.id] || [],
    address: {
      city: res.city,
      neighborhood: res.neighborhood,
      street: res.street
    },
    utilitiesIncluded: res.utilitiesIncludedRaw
      ? (typeof res.utilitiesIncludedRaw === 'string' ? JSON.parse(res.utilitiesIncludedRaw) : res.utilitiesIncludedRaw)
      : { water: false, electricity: false }
  }));
};

export const getResidenceById = async (id: string) => {
  const res = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      utilities_included as utilitiesIncludedRaw,
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
  residence.utilitiesIncluded = residence.utilitiesIncludedRaw
    ? (typeof residence.utilitiesIncludedRaw === 'string' ? JSON.parse(res.utilitiesIncludedRaw) : residence.utilitiesIncludedRaw)
    : { water: false, electricity: false };
  return residence;
};

// Settings
export const getSettings = async (key: string) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  return results.length > 0 ? JSON.parse(results[0].value) : {};
};

export const saveSettings = async (key: string, value: any) => {
  console.log(`[DEBUG] Saving settings for key: ${key}, value:`, JSON.stringify(value));
  const dbType = process.env.DB_TYPE || 'sqlite';
  const valString = JSON.stringify(value);
  if (dbType === 'mariadb') {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [key, valString]);
  } else {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET value = excluded.value", [key, valString]);
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

export const formatSqlValue = (val: any) => {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.replace('T', ' ').substring(0, 19);
  }
  if (val !== null && typeof val === 'object') {
    return JSON.stringify(val);
  }
  return val;
};

const VALID_RESIDENCE_COLS = new Set([
  'id', 'owner_id', 'title', 'description', 'type', 'price_per_night',
  'advance_percentage', 'cleaning_fee', 'service_fee', 'city', 'neighborhood',
  'street', 'capacity', 'bedrooms', 'beds', 'bathrooms', 'rooms', 'status',
  'availability_status', 'promoted', 'weekly_discount', 'monthly_discount',
  'promo_price', 'rejection_reason', 'utilities_included', 'created_at'
]);

export const updateResidence = async (id: string, updates: any) => {
  const { amenities, images, address, utilitiesIncluded, ...rest } = updates;
  
  const mappedUpdates: any = {};
  for (const [k, v] of Object.entries(rest)) {
    const snakeKey = toSnakeCase(k);
    if (VALID_RESIDENCE_COLS.has(snakeKey)) {
      mappedUpdates[snakeKey] = formatSqlValue(v);
    }
  }
  if (address) {
    mappedUpdates.city = address.city;
    mappedUpdates.neighborhood = address.neighborhood;
    mappedUpdates.street = address.street;
  }
  if (utilitiesIncluded !== undefined) {
    mappedUpdates.utilities_included = formatSqlValue(utilitiesIncluded);
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
    const snakeKey = toSnakeCase(k);
    if (VALID_RESIDENCE_COLS.has(snakeKey) || snakeKey === 'id') {
      mappedObj[snakeKey] = formatSqlValue(v);
    }
  }
  if (address) {
    mappedObj.city = address.city;
    mappedObj.neighborhood = address.neighborhood;
    mappedObj.street = address.street;
  }
  if (utilitiesIncluded !== undefined) {
    mappedObj.utilities_included = formatSqlValue(utilitiesIncluded);
  }
  if (res.id) mappedObj.id = res.id;

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
  const mappedUpdates: any = {};
  for (const [k, v] of Object.entries(updates)) {
    mappedUpdates[toSnakeCase(k)] = formatSqlValue(v);
  }
  const fields = Object.keys(mappedUpdates);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await executeSql(`UPDATE bookings SET ${setClause} WHERE id = ?`, [...Object.values(mappedUpdates), id]);
};

export const updateUserProfile = async (uid: string, updates: any) => {
  const mappedUpdates: any = { uid };
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'uid') continue;
    
    let dbValue = formatSqlValue(v);
    
    if (k === 'displayName') mappedUpdates.display_name = dbValue;
    else if (k === 'photoUrl') mappedUpdates.photo_url = dbValue;
    else if (k === 'isVerified') mappedUpdates.is_verified = dbValue;
    else if (k === 'isSuspended') mappedUpdates.is_suspended = dbValue;
    else if (k === 'phoneNumber') mappedUpdates.phone_number = dbValue;
    else if (k === 'createdAt') mappedUpdates.created_at = dbValue;
    else mappedUpdates[toSnakeCase(k)] = dbValue;
  }
  const fields = Object.keys(mappedUpdates);
  if (fields.length === 0) return;
  const placeholders = fields.map(() => '?').join(', ');
  
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (dbType === 'mariadb') {
    const updateClause = fields.filter(f => f !== 'uid').map(f => `${f} = VALUES(${f})`).join(', ');
    await executeSql(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`, Object.values(mappedUpdates));
  } else {
    const updateClause = fields.filter(f => f !== 'uid').map(f => `${f} = ?`).join(', ');
    const updateValues = fields.filter(f => f !== 'uid').map(f => mappedUpdates[f]);
    await executeSql(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders}) ON CONFLICT(uid) DO UPDATE SET ${updateClause}`, [...Object.values(mappedUpdates), ...updateValues]);
  }
};

export const deleteUser = async (uid: string) => {
  await executeSql("DELETE FROM users WHERE uid = ?", [uid]);
};

export const deleteReview = async (id: string) => {
  await executeSql("DELETE FROM reviews WHERE id = ?", [id]);
};
