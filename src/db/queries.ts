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
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
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
    utilitiesIncluded: (() => {
      try {
        if (!res.utilitiesIncludedRaw) return { water: false, electricity: false };
        return typeof res.utilitiesIncludedRaw === 'string' ? JSON.parse(res.utilitiesIncludedRaw) : res.utilitiesIncludedRaw;
      } catch (e) {
        console.warn(`Error parsing utilitiesIncluded for residence ${res.id}:`, e);
        return { water: false, electricity: false };
      }
    })()
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
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
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
  residence.utilitiesIncluded = (() => {
    try {
      if (!residence.utilitiesIncludedRaw) return { water: false, electricity: false };
      return typeof residence.utilitiesIncludedRaw === 'string' ? JSON.parse(residence.utilitiesIncludedRaw) : residence.utilitiesIncludedRaw;
    } catch (e) {
      console.warn(`Error parsing utilitiesIncluded for residence ${id}:`, e);
      return { water: false, electricity: false };
    }
  })();
  return residence;
};

// Bookings
export const getAllBookings = async (options: { clientId?: string, ownerId?: string, isAdmin?: boolean, residenceId?: string } = {}) => {
  let sql = `
    SELECT 
      id, residence_id as residenceId, client_id as clientId, owner_id as ownerId, 
      check_in as checkIn, check_out as checkOut, guests, total_price as totalPrice, 
      advance_paid as advancePaid, payment_status as paymentStatus, booking_status as bookingStatus, 
      transaction_id as transactionId, cancelled_by as cancelledBy, cancellation_reason as cancellationReason, 
      cancelled_at as cancelledAt, refund_status as refundStatus, refund_amount as refundAmount, 
      refund_phone as refundPhone, refund_provider as refundProvider, refund_processed_at as refundProcessedAt, 
      stay_status as stayStatus, checked_in_at as checkedInAt, checked_out_at as checkedOutAt, 
      created_at as createdAt 
    FROM bookings
  `;
  // For MariaDB, we might need to ensure the driver doesn't mangle aliases.
  // Actually, let's keep it and if it fails, we'll try manual mapping in JS.
  // But wait, I'll add a manual mapping step just to be safe.
  
  let params: any[] = [];
  
  const whereClauses: string[] = [];
  if (options.residenceId) {
    whereClauses.push("residence_id = ?");
    params.push(options.residenceId);
  }

  if (!options.isAdmin) {
    if (options.clientId && options.ownerId) {
      whereClauses.push("(client_id = ? OR owner_id = ?)");
      params.push(options.clientId, options.ownerId);
    } else if (options.clientId) {
      whereClauses.push("client_id = ?");
      params.push(options.clientId);
    } else if (options.ownerId) {
      whereClauses.push("owner_id = ?");
      params.push(options.ownerId);
    }
  }

  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }

  sql += " ORDER BY created_at DESC";

  const rows = await executeSql(sql, params);
  
  // Manual mapping to ensure camelCase for MariaDB which sometimes returns snake_case even with aliases
  return rows.map((row: any) => ({
    id: row.id,
    residenceId: row.residenceId || row.residence_id,
    clientId: row.clientId || row.client_id,
    ownerId: row.ownerId || row.owner_id,
    checkIn: row.checkIn || row.check_in,
    checkOut: row.checkOut || row.check_out,
    guests: row.guests,
    totalPrice: row.totalPrice !== undefined ? row.totalPrice : row.total_price,
    advancePaid: row.advancePaid !== undefined ? row.advancePaid : row.advance_paid,
    paymentStatus: row.paymentStatus || row.payment_status,
    bookingStatus: row.bookingStatus || row.booking_status,
    transactionId: row.transactionId || row.transaction_id,
    cancelledBy: row.cancelledBy || row.cancelled_by,
    cancellationReason: row.cancellationReason || row.cancellation_reason,
    cancelledAt: row.cancelledAt || row.cancelled_at,
    refundStatus: row.refundStatus || row.refund_status,
    refundAmount: row.refundAmount !== undefined ? row.refundAmount : row.refund_amount,
    refundPhone: row.refundPhone || row.refund_phone,
    refundProvider: row.refundProvider || row.refund_provider,
    refundProcessedAt: row.refundProcessedAt || row.refund_processed_at,
    stayStatus: row.stayStatus || row.stay_status,
    checkedInAt: row.checkedInAt || row.checked_in_at,
    checkedOutAt: row.checkedOutAt || row.checked_out_at,
    createdAt: row.createdAt || row.created_at
  }));
};

export const getBookingById = async (id: string) => {
  const results = await executeSql(`
    SELECT 
      id, residence_id as residenceId, client_id as clientId, owner_id as ownerId, 
      check_in as checkIn, check_out as checkOut, guests, total_price as totalPrice, 
      advance_paid as advancePaid, payment_status as paymentStatus, booking_status as bookingStatus, 
      transaction_id as transactionId, created_at as createdAt 
    FROM bookings 
    WHERE id = ?
  `, [id]);
  
  const row = results[0];
  if (!row) return null;
  
  return {
    id: row.id,
    residenceId: row.residenceId || row.residence_id,
    clientId: row.clientId || row.client_id,
    ownerId: row.ownerId || row.owner_id,
    checkIn: row.checkIn || row.check_in,
    checkOut: row.checkOut || row.check_out,
    guests: row.guests,
    totalPrice: row.totalPrice !== undefined ? row.totalPrice : row.total_price,
    advancePaid: row.advancePaid !== undefined ? row.advancePaid : row.advance_paid,
    paymentStatus: row.paymentStatus || row.payment_status,
    bookingStatus: row.bookingStatus || row.booking_status,
    transactionId: row.transactionId || row.transaction_id,
    createdAt: row.createdAt || row.created_at
  };
};

// Settings
export const getSettings = async (key: string) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  if (results.length === 0) return {};
  
  try {
    const data = typeof results[0].value === 'string' ? JSON.parse(results[0].value) : results[0].value;
    
    // Harmonize types for 'global' settings
    if (key === 'global' && data) {
      if (data.commissionRate !== undefined) data.commissionRate = Number(data.commissionRate);
      if (data.isTestMode !== undefined) data.isTestMode = Boolean(data.isTestMode);
      if (data.enablePhoneCalls !== undefined) data.enablePhoneCalls = Boolean(data.enablePhoneCalls);
      if (data.enableWhatsApp !== undefined) data.enableWhatsApp = Boolean(data.enableWhatsApp);
      if (data.announcement && data.announcement.active !== undefined) {
        data.announcement.active = Boolean(data.announcement.active);
      }
    }
    
    return data;
  } catch (e) {
    console.error(`[Error] Failed to parse settings for key ${key}:`, e);
    return {};
  }
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
  const rows = await executeSql(`
    SELECT 
      id, title, description, image_url as imageUrl, link_url as linkUrl, 
      is_active as isActive, frequency_seconds as frequencySeconds, 
      start_at as startAt, end_at as endAt, created_at as createdAt 
    FROM advertisements 
    ORDER BY created_at DESC
  `);
  
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl || row.image_url,
    linkUrl: row.linkUrl || row.link_url,
    isActive: row.isActive !== undefined ? row.isActive : row.is_active,
    frequencySeconds: row.frequencySeconds !== undefined ? row.frequencySeconds : row.frequency_seconds,
    startAt: row.startAt || row.start_at,
    endAt: row.endAt || row.end_at,
    createdAt: row.createdAt || row.created_at
  }));
};

// Reviews
export const getAllReviews = async () => {
  return await executeSql(`
    SELECT 
      id, booking_id as bookingId, residence_id as residenceId, client_id as clientId, 
      rating, comment, created_at as createdAt 
    FROM reviews 
    ORDER BY created_at DESC
  `);
};

// Withdrawals
export const getAllWithdrawals = async (ownerId?: string) => {
  let sql = `
    SELECT 
      id, owner_id as ownerId, amount, phone, provider, status, 
      created_at as createdAt, approved_at as approvedAt 
    FROM withdrawals
  `;
  let params: any[] = [];
  if (ownerId) {
    sql += " WHERE owner_id = ?";
    params = [ownerId];
  }
  sql += " ORDER BY created_at DESC";
  return await executeSql(sql, params);
};

// Contact Messages
export const getAllContactMessages = async () => {
  return await executeSql(`
    SELECT 
      id, name, email, subject, message, status, 
      admin_notes as adminNotes, replied_at as repliedAt, created_at as createdAt 
    FROM contact_messages 
    ORDER BY created_at DESC
  `);
};

// Conversations & Messages
export const getAllConversations = async (uid: string, isAdmin: boolean = false) => {
  let sql = `
    SELECT id, participants, related_id as relatedId, updated_at as updatedAt 
    FROM conversations 
  `;
  let params: any[] = [];
  
  if (!isAdmin) {
    sql += " WHERE participants LIKE ?";
    params = [`%${uid}%`];
  }
  
  sql += " ORDER BY updated_at DESC";
  
  const conversations = await executeSql(sql, params);
  
  return conversations.map((c: any) => ({
    id: c.id,
    relatedId: c.relatedId || c.related_id,
    updatedAt: c.updatedAt || c.updated_at,
    participants: typeof c.participants === 'string' ? c.participants.split(',') : c.participants
  }));
};

export const getMessages = async (conversationId: string) => {
  return await executeSql(`
    SELECT 
      id, conversation_id as conversationId, sender_id as senderId, 
      text, is_read as isRead, created_at as createdAt 
    FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `, [conversationId]);
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
  'promo_price', 'rejection_reason', 'utilities_included', 'owner_phone', 'created_at'
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

export const getNotifications = async (userId: string) => {
  const rows = await executeSql("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id || row.userId,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read !== undefined ? !!row.is_read : !!row.isRead,
    referenceId: row.reference_id || row.referenceId,
    createdAt: row.created_at || row.createdAt
  }));
};

export const markNotificationAsRead = async (id: string) => {
  await executeSql("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
};

export const deleteNotification = async (id: string) => {
  await executeSql("DELETE FROM notifications WHERE id = ?", [id]);
};
