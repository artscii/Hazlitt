import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {id:text('id').primaryKey(),payload:text('payload').notNull(),nameKey:text('name_key').unique(),deleted:integer('deleted').notNull().default(0),revision:integer('revision').notNull().default(1)});
export const sessions = sqliteTable('sessions', {token:text('token').primaryKey(),expires:integer('expires').notNull()});
export const attempts = sqliteTable('attempts', {key:text('key').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const audit = sqliteTable('audit_log', {id:text('id').primaryKey(),at:integer('at').notNull(),action:text('action').notNull(),revision:integer('revision').notNull().default(0),recordId:text('record_id').notNull(),name:text('name').notNull(),ip:text('ip').notNull(),before:text('before'),after:text('after')});

export const siteSettings = sqliteTable('site_settings', {key:text('key').primaryKey(),payload:text('payload').notNull()});
