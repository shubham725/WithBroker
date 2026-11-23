import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  propertyCode: text('property_code').notNull().unique(), // e.g. WB-1001
  title: text('title').notNull(),
  propertyType: text('property_type').notNull(), // '1RK' | '1BHK' | '2BHK' | '3BHK'
  locality: text('locality').notNull(),
  subLocality: text('sub_locality').notNull(),
  localitySlug: text('locality_slug').notNull(),
  societyName: text('society_name'),
  publicAreaNote: text('public_area_note').notNull(),
  lat: doublePrecision('lat').notNull().default(18.5529),
  lng: doublePrecision('lng').notNull().default(73.9277),
  monthlyRent: integer('monthly_rent').notNull(),
  securityDeposit: integer('security_deposit'),
  brokerageStatus: text('brokerage_status').notNull().default('Applicable'),
  brokerageAmount: integer('brokerage_amount').notNull().default(0),
  maintenanceCharges: text('maintenance_charges'),
  furnishing: text('furnishing').notNull().default('Unfurnished'),
  availableFrom: text('available_from').notNull().default('Immediate'),
  bathrooms: integer('bathrooms').notNull().default(1),
  bathroomType: text('bathroom_type').notNull().default('1 Bathroom'),
  balconies: integer('balconies').notNull().default(0),
  floorNumber: text('floor_number'),
  totalFloors: text('total_floors'),
  floorInfo: text('floor_info'),
  carpetArea: text('carpet_area'),
  builtUpArea: text('built_up_area'),
  facing: text('facing'),
  parking: text('parking').notNull().default('Ask on inquiry'),
  waterAvailability: text('water_availability').notNull().default('24 Hours Water Supply'),
  liftAvailability: text('lift_availability').notNull().default('Ask on inquiry'),
  suitableFor: text('suitable_for').notNull().default('Family / Bachelors'),
  shortDescription: text('short_description').notNull(),
  fullDescription: text('full_description').notNull(),
  additionalNotes: text('additional_notes').notNull().default(''),
  facilities: jsonb('facilities').$type<string[]>().notNull().default([]),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  // Owner / Broker details (contact info restricted to authenticated admin routes)
  submitterName: text('submitter_name').notNull(),
  submitterMobile: text('submitter_mobile').notNull(),
  submitterWhatsapp: text('submitter_whatsapp').notNull(),
  submitterRole: text('submitter_role').notNull().default('Owner'), // 'Owner' | 'Broker'
  // Moderation & lifecycle workflow
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Available' | 'Rejected' | 'Rented'
  rejectionReason: text('rejection_reason'),
  submissionHash: text('submission_hash'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const propertyPhotos = pgTable('property_photos', {
  id: text('id').primaryKey(), // UUID
  propertyId: integer('property_id')
    .references(() => properties.id, { onDelete: 'cascade' })
    .notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminNotifications = pgTable('admin_notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'submission' | 'approved' | 'rejected' | 'rented' | 'available' | 'deleted'
  propertyId: integer('property_id'),
  propertyCode: text('property_code').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const propertiesRelations = relations(properties, ({ many }) => ({
  photos: many(propertyPhotos),
}));

export const propertyPhotosRelations = relations(propertyPhotos, ({ one }) => ({
  property: one(properties, {
    fields: [propertyPhotos.propertyId],
    references: [properties.id],
  }),
}));

export type DbUser = typeof users.$inferSelect;
export type DbProperty = typeof properties.$inferSelect;
export type DbPropertyPhoto = typeof propertyPhotos.$inferSelect;
export type DbAdminNotification = typeof adminNotifications.$inferSelect;
