import { executeSql } from './index';

const cleanSecteur = (val: string | any): string | any => {
  if (!val || typeof val !== 'string') return val;
  return val.replace(/\bS[EÉ]C\b/gi, 'Secteur');
};

// Users
export const getUserProfile = async (uid: string) => {
  const users = await executeSql(`
    SELECT 
      uid, email, display_name as displayName, role, photo_url as photoUrl, 
      is_verified as isVerified, created_at as createdAt, is_suspended as isSuspended, 
      permissions, identity_document_front as identityDocumentFront, 
      identity_document_back as identityDocumentBack, id_number as idNumber, 
      id_type as idType, id_expiry as idExpiry, id_card_url as idCardUrl, 
      verification_status as verificationStatus, phone_number as phoneNumber, phone_number as phone,
      host_cancellation_fee as hostCancellationFee, host_cancellation_rules_text as hostCancellationRulesText
    FROM users 
    WHERE uid = ?
  `, [uid]);

  if (users.length === 0) return null;
  
  const user = users[0];
  // Ensure hasAcceptedTerms is present even if column was missing in query result
  if (user.hasAcceptedTerms === undefined) {
    user.hasAcceptedTerms = 1; // Default to true if column is missing to avoid blocking users
  }
  
  return user;
};

export const getAllUsers = async () => {
  return await executeSql(`
    SELECT 
      uid, email, display_name as displayName, role, photo_url as photoUrl, 
      is_verified as isVerified, created_at as createdAt, is_suspended as isSuspended, 
      permissions, identity_document_front as identityDocumentFront, 
      identity_document_back as identityDocumentBack, id_number as idNumber, 
      id_type as idType, id_expiry as idExpiry, id_card_url as idCardUrl, 
      verification_status as verificationStatus, phone_number as phoneNumber,
      has_accepted_terms as hasAcceptedTerms,
      host_cancellation_fee as hostCancellationFee, host_cancellation_rules_text as hostCancellationRulesText
    FROM users 
    ORDER BY created_at DESC
  `);
};

// Residences
export const getAllResidences = async (ownerId?: string) => {
  let sql = `
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
      created_at as createdAt 
    FROM residences
  `;
  
  const params: any[] = [];
  if (ownerId) {
    sql += " WHERE owner_id = ?";
    params.push(ownerId);
  }
  
  sql += " ORDER BY created_at DESC";

  const rows = await executeSql(sql, params);

  if (rows.length === 0) return [];

  const allAmenities = await executeSql("SELECT residence_id, amenity FROM residence_amenities");
  const allImages = await executeSql("SELECT residence_id, image_url FROM residence_images");

  const amenitiesMap: Record<string, string[]> = {};
  allAmenities.forEach((a: any) => {
    const resId = a.residence_id || a.residenceId;
    if (!amenitiesMap[resId]) amenitiesMap[resId] = [];
    amenitiesMap[resId].push(a.amenity);
  });

  const imagesMap: Record<string, string[]> = {};
  allImages.forEach((i: any) => {
    const resId = i.residence_id || i.residenceId;
    if (!imagesMap[resId]) imagesMap[resId] = [];
    imagesMap[resId].push(i.image_url || i.imageUrl);
  });

  const activeBookings = await executeSql(`
    SELECT residence_id, check_in, check_out 
    FROM bookings 
    WHERE booking_status NOT IN ('cancelled', 'declined')
  `);

  const bookingsMap: Record<string, any[]> = {};
  const todayStr = new Date().toISOString().split('T')[0];
  
  activeBookings.forEach((b: any) => {
    const resId = b.residence_id || b.residenceId;
    let checkOut = b.checkOut || b.check_out;
    let checkIn = b.checkIn || b.check_in;
    
    if (checkOut instanceof Date) checkOut = checkOut.toISOString();
    if (checkIn instanceof Date) checkIn = checkIn.toISOString();
    
    checkOut = String(checkOut).split('T')[0];
    checkIn = String(checkIn).split('T')[0];
    
    if (checkOut >= todayStr) {
      if (!bookingsMap[resId]) bookingsMap[resId] = [];
      bookingsMap[resId].push({ from: checkIn, to: checkOut });
    }
  });

  return rows.map((res: any) => ({
    id: res.id,
    ownerId: res.ownerId || res.owner_id || res.ownerid,
    title: res.title,
    description: res.description,
    type: res.type,
    pricePerNight: res.pricePerNight !== undefined ? res.pricePerNight : (res.price_per_night !== undefined ? res.price_per_night : res.pricepernight),
    advancePercentage: res.advancePercentage !== undefined ? res.advancePercentage : (res.advance_percentage !== undefined ? res.advance_percentage : res.advancepercentage),
    cleaningFee: res.cleaningFee !== undefined ? res.cleaningFee : (res.cleaning_fee !== undefined ? res.cleaning_fee : res.cleaningfee),
    serviceFee: res.serviceFee !== undefined ? res.serviceFee : (res.service_fee !== undefined ? res.service_fee : res.servicefee),
    city: res.city,
    neighborhood: res.neighborhood,
    street: res.street,
    capacity: res.capacity,
    bedrooms: res.bedrooms,
    beds: res.beds,
    bathrooms: res.bathrooms,
    rooms: res.rooms,
    status: res.status,
    availabilityStatus: res.availabilityStatus || res.availability_status || res.availabilitystatus,
    promoted: res.promoted !== undefined ? !!res.promoted : !!res.promoted,
    weeklyDiscount: res.weeklyDiscount !== undefined ? res.weeklyDiscount : (res.weekly_discount !== undefined ? res.weekly_discount : res.weeklydiscount),
    monthlyDiscount: res.monthlyDiscount !== undefined ? res.monthlyDiscount : (res.monthly_discount !== undefined ? res.monthly_discount : res.monthlydiscount),
    promoPrice: res.promoPrice !== undefined ? res.promoPrice : (res.promo_price !== undefined ? res.promo_price : res.promoprice),
    rejectionReason: res.rejectionReason || res.rejection_reason || res.rejectionreason,
    ownerPhone: res.ownerPhone || res.owner_phone || res.ownerphone,
    createdAt: res.createdAt || res.created_at || res.createdat,
    amenities: amenitiesMap[res.id] || [],
    images: imagesMap[res.id] || [],
    occupiedDates: bookingsMap[res.id] || [],
    address: {
      city: cleanSecteur(res.city),
      neighborhood: cleanSecteur(res.neighborhood),
      street: cleanSecteur(res.street || res.neighborhood)
    },
    utilitiesIncluded: (() => {
      try {
        const raw = res.utilitiesIncludedRaw || res.utilities_included || res.utilitiesincluded;
        if (!raw) return { water: false, electricity: false };
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        console.warn(`Error parsing utilitiesIncluded for residence ${res.id}:`, e);
        return { water: false, electricity: false };
      }
    })()
  }));
};

export const getResidenceById = async (id: string) => {
  const rows = await executeSql(`
    SELECT 
      id, owner_id as ownerId, title, description, type, price_per_night as pricePerNight, 
      advance_percentage as advancePercentage, cleaning_fee as cleaningFee, service_fee as serviceFee, 
      city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, 
      availability_status as availabilityStatus, promoted, weekly_discount as weeklyDiscount, 
      monthly_discount as monthlyDiscount, promo_price as promoPrice, rejection_reason as rejectionReason, 
      utilities_included as utilitiesIncludedRaw, owner_phone as ownerPhone,
      created_at as createdAt 
    FROM residences WHERE id = ?
  `, [id]);

  if (rows.length === 0) return null;
  const row = rows[0];

  const amenities = await executeSql("SELECT amenity FROM residence_amenities WHERE residence_id = ?", [id]);
  const images = await executeSql("SELECT image_url FROM residence_images WHERE residence_id = ?", [id]);
  const bookings = await executeSql(`
    SELECT check_in, check_out 
    FROM bookings 
    WHERE residence_id = ? AND booking_status NOT IN ('cancelled', 'declined')
  `, [id]);
  
  return {
    id: row.id,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    title: row.title,
    description: row.description,
    type: row.type,
    pricePerNight: row.pricePerNight !== undefined ? row.pricePerNight : (row.price_per_night !== undefined ? row.price_per_night : row.pricepernight),
    advancePercentage: row.advancePercentage !== undefined ? row.advancePercentage : (row.advance_percentage !== undefined ? row.advance_percentage : row.advancepercentage),
    cleaningFee: row.cleaningFee !== undefined ? row.cleaningFee : (row.cleaning_fee !== undefined ? row.cleaning_fee : row.cleaningfee),
    serviceFee: row.serviceFee !== undefined ? row.serviceFee : (row.service_fee !== undefined ? row.service_fee : row.servicefee),
    city: row.city,
    neighborhood: row.neighborhood,
    street: row.street,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    rooms: row.rooms,
    status: row.status,
    availabilityStatus: row.availabilityStatus || row.availability_status || row.availabilitystatus,
    promoted: row.promoted !== undefined ? !!row.promoted : !!row.promoted,
    weeklyDiscount: row.weeklyDiscount !== undefined ? row.weeklyDiscount : (row.weekly_discount !== undefined ? row.weekly_discount : row.weeklydiscount),
    monthlyDiscount: row.monthlyDiscount !== undefined ? row.monthlyDiscount : (row.monthly_discount !== undefined ? row.monthly_discount : row.monthlydiscount),
    promoPrice: row.promoPrice !== undefined ? row.promoPrice : (row.promo_price !== undefined ? row.promo_price : row.promoprice),
    rejectionReason: row.rejectionReason || row.rejection_reason || row.rejectionreason,
    ownerPhone: row.ownerPhone || row.owner_phone || row.ownerphone,
    createdAt: row.createdAt || row.created_at || row.createdat,
    amenities: amenities.map((a: any) => a.amenity),
    images: images.map((i: any) => i.image_url || i.imageUrl),
    occupiedDates: bookings
      .map((b: any) => {
        let co = b.checkOut || b.check_out;
        let ci = b.checkIn || b.check_in;
        if (co instanceof Date) co = co.toISOString();
        if (ci instanceof Date) ci = ci.toISOString();
        return { from: String(ci).split('T')[0], to: String(co).split('T')[0] };
      })
      .filter((b: any) => b.to >= new Date().toISOString().split('T')[0]),
    address: {
      city: cleanSecteur(row.city),
      neighborhood: cleanSecteur(row.neighborhood),
      street: cleanSecteur(row.street || row.neighborhood)
    },
    utilitiesIncluded: (() => {
      try {
        const raw = row.utilitiesIncludedRaw || row.utilities_included || row.utilitiesincluded;
        if (!raw) return { water: false, electricity: false };
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        console.warn(`Error parsing utilitiesIncluded for residence ${id}:`, e);
        return { water: false, electricity: false };
      }
    })()
  };
};

// Bookings
export const getAllBookings = async (options: { clientId?: string, ownerId?: string, isAdmin?: boolean, residenceId?: string } = {}) => {
  let sql = `
    SELECT 
      b.id, b.residence_id as residenceId, b.client_id as clientId, b.owner_id as ownerId, 
      b.check_in as checkIn, b.check_out as checkOut, b.guests, b.total_price as totalPrice, 
      b.advance_paid as advancePaid, b.payment_status as paymentStatus, b.booking_status as bookingStatus, 
      b.transaction_id as transactionId, b.cancelled_by as cancelledBy, b.cancellation_reason as cancellationReason, 
      b.cancelled_at as cancelledAt, b.refund_status as refundStatus, b.refund_amount as refundAmount, 
      b.refund_phone as refundPhone, b.refund_provider as refundProvider, b.refund_processed_at as refundProcessedAt, 
      b.host_cancellation_fee as hostCancellationFee, b.nights_consumed as nightsConsumed, b.cost_of_nights_spent as costOfNightsSpent,
      b.stay_status as stayStatus, b.checked_in_at as checkedInAt, b.checked_out_at as checkedOutAt, 
      b.verifications_status as verificationsStatus,
      b.created_at as createdAt,
      u.display_name as clientName
    FROM bookings b
    LEFT JOIN users u ON b.client_id = u.uid
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

  sql += " ORDER BY b.created_at DESC";

  const rows = await executeSql(sql, params);
  
  // Manual mapping to ensure camelCase for MariaDB which sometimes returns snake_case even with aliases
  return rows.map((row: any) => ({
    id: row.id,
    residenceId: row.residenceId || row.residence_id || row.residenceid,
    clientId: row.clientId || row.client_id || row.clientid,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    checkIn: row.checkIn || row.check_in || row.checkin,
    checkOut: row.checkOut || row.check_out || row.checkout,
    guests: row.guests,
    totalPrice: row.totalPrice !== undefined ? row.totalPrice : (row.total_price !== undefined ? row.total_price : row.totalprice),
    advancePaid: row.advancePaid !== undefined ? row.advancePaid : (row.advance_paid !== undefined ? row.advance_paid : row.advancepaid),
    paymentStatus: row.paymentStatus || row.payment_status || row.paymentstatus,
    bookingStatus: row.bookingStatus || row.booking_status || row.bookingstatus,
    transactionId: row.transactionId || row.transaction_id || row.transactionid,
    cancelledBy: row.cancelledBy || row.cancelled_by || row.cancelledby,
    cancellationReason: row.cancellationReason || row.cancellation_reason || row.cancellationreason,
    cancelledAt: row.cancelledAt || row.cancelled_at || row.cancelledat,
    refundStatus: row.refundStatus || row.refund_status || row.refundstatus,
    refundAmount: row.refundAmount !== undefined ? row.refundAmount : (row.refund_amount !== undefined ? row.refund_amount : row.refundamount),
    refundPhone: row.refundPhone || row.refund_phone || row.refundphone,
    refundProvider: row.refundProvider || row.refund_provider || row.refundprovider,
    refundProcessedAt: row.refundProcessedAt || row.refund_processed_at || row.refundprocessedat,
    hostCancellationFee: row.hostCancellationFee !== undefined ? row.hostCancellationFee : (row.host_cancellation_fee !== undefined ? row.host_cancellation_fee : row.hostcancellationfee),
    nightsConsumed: row.nightsConsumed !== undefined ? row.nightsConsumed : (row.nights_consumed !== undefined ? row.nights_consumed : row.nightsconsumed),
    costOfNightsSpent: row.costOfNightsSpent !== undefined ? row.costOfNightsSpent : (row.cost_of_nights_spent !== undefined ? row.cost_of_nights_spent : row.costofnightsspent),
    stayStatus: row.stayStatus || row.stay_status || row.staystatus,
    checkedInAt: row.checkedInAt || row.checked_in_at || row.checkedinat,
    checkedOutAt: row.checkedOutAt || row.checked_out_at || row.checkedoutat,
    verificationsStatus: row.verificationsStatus || row.verifications_status || row.verificationsstatus,
    createdAt: row.createdAt || row.created_at || row.createdat,
    clientName: row.clientName || row.client_name || row.clientname
  }));
};

export const getBookingById = async (id: string) => {
  const results = await executeSql(`
    SELECT 
      b.id, b.residence_id as residenceId, b.client_id as clientId, b.owner_id as ownerId, 
      b.check_in as checkIn, b.check_out as checkOut, b.guests, b.total_price as totalPrice, 
      b.advance_paid as advancePaid, b.payment_status as paymentStatus, b.booking_status as bookingStatus, 
      b.transaction_id as transactionId, b.verifications_status as verificationsStatus,
      b.host_cancellation_fee as hostCancellationFee, b.nights_consumed as nightsConsumed, b.cost_of_nights_spent as costOfNightsSpent,
      b.created_at as createdAt,
      u.display_name as clientName
    FROM bookings b
    LEFT JOIN users u ON b.client_id = u.uid
    WHERE b.id = ?
  `, [id]);
  
  const row = results[0];
  if (!row) return null;
  
  return {
    id: row.id,
    residenceId: row.residenceId || row.residence_id || row.residenceid,
    clientId: row.clientId || row.client_id || row.clientid,
    ownerId: row.ownerId || row.owner_id || row.ownerid,
    checkIn: row.checkIn || row.check_in || row.checkin,
    checkOut: row.checkOut || row.check_out || row.checkout,
    guests: row.guests,
    totalPrice: row.totalPrice !== undefined ? row.totalPrice : (row.total_price !== undefined ? row.total_price : row.totalprice),
    advancePaid: row.advancePaid !== undefined ? row.advancePaid : (row.advance_paid !== undefined ? row.advance_paid : row.advancepaid),
    paymentStatus: row.paymentStatus || row.payment_status || row.paymentstatus,
    bookingStatus: row.bookingStatus || row.booking_status || row.bookingstatus,
    transactionId: row.transactionId || row.transaction_id || row.transactionid,
    verificationsStatus: row.verificationsStatus || row.verifications_status || row.verificationsstatus,
    hostCancellationFee: row.hostCancellationFee !== undefined ? row.hostCancellationFee : (row.host_cancellation_fee !== undefined ? row.host_cancellation_fee : row.hostcancellationfee),
    nightsConsumed: row.nightsConsumed !== undefined ? row.nightsConsumed : (row.nights_consumed !== undefined ? row.nights_consumed : row.nightsconsumed),
    costOfNightsSpent: row.costOfNightsSpent !== undefined ? row.costOfNightsSpent : (row.cost_of_nights_spent !== undefined ? row.cost_of_nights_spent : row.costofnightsspent),
    createdAt: row.createdAt || row.created_at || row.createdat,
    clientName: row.clientName || row.client_name || row.clientname
  };
};

// Settings
export const getSettings = async (key: string) => {
  const results = await executeSql("SELECT value FROM settings WHERE `key` = ?", [key]);
  if (results.length === 0) return {};
  
  try {
    let data = typeof results[0].value === 'string' ? JSON.parse(results[0].value) : results[0].value;
    
    // Replace old bad slogans
    if (data && typeof data === 'object') {
      const replaceSlogan = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj === 'string') {
          return obj.replace(/HOSPITALIT[ÉE]\s+MORTS?\s+COMFORT/gi, "HOSPITALITÉ, CONFORT, SÉRÉNITÉ");
        }
        if (Array.isArray(obj)) {
          return obj.map(replaceSlogan);
        }
        if (typeof obj === 'object') {
          const res: any = {};
          for (const [k, v] of Object.entries(obj)) {
            res[k] = replaceSlogan(v);
          }
          return res;
        }
        return obj;
      };
      data = replaceSlogan(data);
    }

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
  const valString = JSON.stringify(value);
  const existing = await executeSql("SELECT `key` FROM settings WHERE `key` = ?", [key]);
  if (existing.length > 0) {
    await executeSql("UPDATE settings SET value = ? WHERE `key` = ?", [valString, key]);
  } else {
    await executeSql("INSERT INTO settings (`key`, value) VALUES (?, ?)", [key, valString]);
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

export const getReviewsByResidenceId = async (residenceId: string) => {
  return await executeSql(`
    SELECT 
      r.id, r.booking_id as bookingId, r.residence_id as residenceId, r.client_id as clientId, 
      r.rating, r.comment, r.created_at as createdAt,
      u.display_name as clientName, u.photo_url as clientPhoto
    FROM reviews r
    LEFT JOIN users u ON r.client_id = u.uid
    WHERE r.residence_id = ?
    ORDER BY r.created_at DESC
  `, [residenceId]);
};

// Withdrawals
export const getAllWithdrawals = async (ownerId?: string) => {
  let sql = `
    SELECT 
      id, owner_id as ownerId, amount, phone, provider, status, 
      created_at as createdAt, approved_at as approvedAt,
      transaction_id as transactionId, rejection_reason as rejectionReason
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
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === 'boolean') {
    return val ? 1 : 0;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.replace('T', ' ').substring(0, 19);
  }
  if (typeof val === 'object') {
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

const VALID_USER_COLS = new Set([
  'uid', 'email', 'display_name', 'phone_number', 'photo_url', 'role', 
  'is_verified', 'is_suspended', 'password_hash', 'identity_document_front', 
  'identity_document_back', 'permissions', 'id_number', 'id_type', 
  'id_expiry', 'id_card_url', 'verification_status', 'has_accepted_terms', 
  'host_cancellation_fee', 'host_cancellation_rules_text', 'created_at',
  'deactivated', 'commission_percentage'
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

const VALID_BOOKING_COLS = new Set([
  'id', 'residence_id', 'client_id', 'owner_id', 'check_in', 'check_out', 
  'guests', 'total_price', 'advance_paid', 'payment_status', 'booking_status', 
  'transaction_id', 'cancelled_by', 'cancellation_reason', 'cancelled_at', 
  'refund_status', 'refund_amount', 'refund_phone', 'refund_provider', 
  'refund_processed_at', 'refund_reason', 'stay_status', 'checked_in_at', 
  'checked_out_at', 'host_cancellation_fee', 'nights_consumed', 
  'cost_of_nights_spent', 'verifications_status', 'created_at'
]);

export const updateBookingStatus = async (id: string, updates: any) => {
  const mappedUpdates: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue;
    let snakeKey = toSnakeCase(k);
    if (snakeKey === 'refund_reason') {
      mappedUpdates['cancellation_reason'] = formatSqlValue(v);
    }
    if (VALID_BOOKING_COLS.has(snakeKey)) {
      mappedUpdates[snakeKey] = formatSqlValue(v);
    }
  }
  const fields = Object.keys(mappedUpdates);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await executeSql(`UPDATE bookings SET ${setClause} WHERE id = ?`, [...Object.values(mappedUpdates), id]);
};

export const updateUserProfile = async (uid: string, updates: any) => {
  const mappedUpdates: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'uid') continue;
    
    let dbValue = formatSqlValue(v);
    let targetKey: string | null = null;
    
    if (k === 'displayName') targetKey = 'display_name';
    else if (k === 'photoUrl') targetKey = 'photo_url';
    else if (k === 'isVerified') targetKey = 'is_verified';
    else if (k === 'isSuspended') targetKey = 'is_suspended';
    else if (k === 'phoneNumber') targetKey = 'phone_number';
    else if (k === 'commissionPercentage') targetKey = 'commission_percentage';
    else if (k === 'createdAt') targetKey = 'created_at';
    else if (k === 'password') targetKey = 'password_hash';
    else {
      const snake = toSnakeCase(k);
      if (VALID_USER_COLS.has(snake)) {
        targetKey = snake;
      }
    }
    
    if (targetKey) {
      mappedUpdates[targetKey] = dbValue;
    }
  }
  
  const existing = await executeSql("SELECT uid FROM users WHERE uid = ?", [uid]);
  if (existing.length > 0) {
    const fields = Object.keys(mappedUpdates);
    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await executeSql(`UPDATE users SET ${setClause} WHERE uid = ?`, [...Object.values(mappedUpdates), uid]);
    }
  } else {
    const fullFields = { uid, ...mappedUpdates };
    const fields = Object.keys(fullFields);
    const placeholders = fields.map(() => '?').join(', ');
    await executeSql(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`, Object.values(fullFields));
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
