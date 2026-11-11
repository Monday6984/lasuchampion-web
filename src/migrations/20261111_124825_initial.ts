import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_story_type" AS ENUM('news', 'feature', 'opinion', 'interview');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_story_type" AS ENUM('news', 'feature', 'opinion', 'interview');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_issues_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__issues_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_comments_status" AS ENUM('visible', 'pending', 'hidden');
  CREATE TYPE "public"."enum_celebrations_status" AS ENUM('pending', 'approved', 'declined');
  CREATE TYPE "public"."enum_celebrations_kind" AS ENUM('birthday', 'wedding', 'graduation', 'promotion', 'anniversary', 'retirement', 'tribute');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'reporter');
  CREATE TYPE "public"."enum_members_member_type" AS ENUM('student', 'alumni', 'staff', 'friend');
  CREATE TYPE "public"."enum_members_alerts" AS ENUM('digest', 'instant', 'off');
  CREATE TYPE "public"."enum_enquiries_status" AS ENUM('new', 'replied', 'closed');
  CREATE TYPE "public"."enum_enquiries_type" AS ENUM('advertising', 'tip', 'general', 'partnership');
  CREATE TYPE "public"."enum_site_settings_ads_placement" AS ENUM('home', 'article', 'sidebar');
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"body" jsonb,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"section_id" integer,
  	"story_type" "enum_posts_story_type" DEFAULT 'news',
  	"author_id" integer,
  	"byline_name" varchar,
  	"featured" boolean DEFAULT false,
  	"reading_time" numeric,
  	"notify_members" boolean DEFAULT true,
  	"alerts_sent" boolean DEFAULT false,
  	"earlier_views" numeric,
  	"legacy_path" varchar,
  	"wp_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_body" jsonb,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_section_id" integer,
  	"version_story_type" "enum__posts_v_version_story_type" DEFAULT 'news',
  	"version_author_id" integer,
  	"version_byline_name" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_reading_time" numeric,
  	"version_notify_members" boolean DEFAULT true,
  	"version_alerts_sent" boolean DEFAULT false,
  	"version_earlier_views" numeric,
  	"version_legacy_path" varchar,
  	"version_wp_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "sections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"description" varchar,
  	"menu_order" numeric DEFAULT 10,
  	"in_main_menu" boolean DEFAULT true,
  	"on_homepage" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sections_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"section_id" integer NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "issues_contents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section" varchar,
  	"page" numeric
  );
  
  CREATE TABLE "issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"issue_number" numeric,
  	"title" varchar,
  	"summary" varchar,
  	"cover_id" integer,
  	"pdf_id" integer,
  	"slug" varchar,
  	"release_date" timestamp(3) with time zone,
  	"allow_download" boolean DEFAULT true,
  	"notify_subscribers" boolean DEFAULT true,
  	"notifications_done" boolean DEFAULT false,
  	"earlier_views" numeric,
  	"legacy_path" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_issues_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_issues_v_version_contents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section" varchar,
  	"page" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_issues_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_issue_number" numeric,
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_cover_id" integer,
  	"version_pdf_id" integer,
  	"version_slug" varchar,
  	"version_release_date" timestamp(3) with time zone,
  	"version_allow_download" boolean DEFAULT true,
  	"version_notify_subscribers" boolean DEFAULT true,
  	"version_notifications_done" boolean DEFAULT false,
  	"version_earlier_views" numeric,
  	"version_legacy_path" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__issues_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"credit" varchar,
  	"source_url" varchar,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_cover_url" varchar,
  	"sizes_cover_width" numeric,
  	"sizes_cover_height" numeric,
  	"sizes_cover_mime_type" varchar,
  	"sizes_cover_filesize" numeric,
  	"sizes_cover_filename" varchar
  );
  
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"member_id" integer,
  	"guest_name" varchar,
  	"parent_id" integer,
  	"body" varchar NOT NULL,
  	"excerpt" varchar,
  	"status" "enum_comments_status" DEFAULT 'visible' NOT NULL,
  	"report_count" numeric DEFAULT 0,
  	"wp_comment_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "celebrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_celebrations_status" DEFAULT 'pending' NOT NULL,
  	"member_id" integer,
  	"kind" "enum_celebrations_kind" NOT NULL,
  	"celebrant" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"headline" varchar,
  	"message" varchar NOT NULL,
  	"photo_id" integer,
  	"decline_reason" varchar,
  	"story_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'reporter' NOT NULL,
  	"active" boolean DEFAULT true,
  	"slug" varchar,
  	"photo_id" integer,
  	"faculty" varchar,
  	"department" varchar,
  	"position" varchar,
  	"bio" varchar,
  	"wp_author_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"username" varchar,
  	"photo_id" integer,
  	"member_type" "enum_members_member_type" DEFAULT 'student',
  	"faculty" varchar,
  	"department" varchar,
  	"level" varchar,
  	"bio" varchar,
  	"alerts" "enum_members_alerts" DEFAULT 'digest' NOT NULL,
  	"magazine_emails" boolean DEFAULT true,
  	"reply_emails" boolean DEFAULT true,
  	"blocked" boolean DEFAULT false,
  	"last_digest_at" timestamp(3) with time zone,
  	"last_notified_issue_id" integer,
  	"must_set_password" boolean DEFAULT false,
  	"invited_at" timestamp(3) with time zone,
  	"wp_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  CREATE TABLE "excos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"office" varchar NOT NULL,
  	"session" varchar NOT NULL,
  	"order" numeric DEFAULT 10,
  	"faculty" varchar,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ambassadors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"title" varchar,
  	"photo_id" integer,
  	"quote" varchar NOT NULL,
  	"profile" varchar,
  	"order" numeric DEFAULT 10,
  	"on_homepage" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_enquiries_status" DEFAULT 'new' NOT NULL,
  	"type" "enum_enquiries_type" NOT NULL,
  	"name" varchar NOT NULL,
  	"organisation" varchar,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar,
  	"message" varchar NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"source" varchar,
  	"last_digest_at" timestamp(3) with time zone,
  	"last_notified_issue_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "daily_views" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" varchar NOT NULL,
  	"doc_id" varchar NOT NULL,
  	"day" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer,
  	"sections_id" integer,
  	"tags_id" integer,
  	"issues_id" integer,
  	"media_id" integer,
  	"comments_id" integer,
  	"celebrations_id" integer,
  	"users_id" integer,
  	"members_id" integer,
  	"excos_id" integer,
  	"ambassadors_id" integer,
  	"enquiries_id" integer,
  	"subscribers_id" integer,
  	"daily_views_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_ad_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"blurb" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_ads" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"advertiser" varchar NOT NULL,
  	"placement" "enum_site_settings_ads_placement" NOT NULL,
  	"image_id" integer NOT NULL,
  	"mobile_image_id" integer,
  	"link" varchar NOT NULL,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"active" boolean DEFAULT true
  );
  
  CREATE TABLE "site_settings_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "site_settings_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"defaults_loaded" boolean DEFAULT false,
  	"show_ticker" boolean DEFAULT true,
  	"tagline" varchar DEFAULT 'The Foremost Inter-Campus News Magazine',
  	"ambassadors_on_homepage" boolean DEFAULT true,
  	"celebrations_on_homepage" boolean DEFAULT true,
  	"mission" varchar,
  	"history" varchar,
  	"current_exco_session" varchar DEFAULT '2026/2027',
  	"ambassadors_intro" varchar,
  	"partner_intro" varchar DEFAULT 'LASU Champion reaches students, staff, alumni and the community around Lagos State University: on the website, in the magazine and on Champion TV.',
  	"partners_email" varchar,
  	"whatsapp" varchar,
  	"reply_time" varchar DEFAULT '2 working days',
  	"media_kit_id" integer,
  	"weekly_digest" boolean DEFAULT true,
  	"min_views_shown" numeric DEFAULT 50,
  	"youtube_channel" varchar DEFAULT 'https://www.youtube.com/@LASUChampionTV',
  	"youtube_channel_id" varchar,
  	"tv_on_homepage" boolean DEFAULT true,
  	"contact_email" varchar DEFAULT 'lasuchampion@gmail.com',
  	"address" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "tv_cache" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"channel_id" varchar,
  	"videos" jsonb,
  	"saved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "email_usage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar,
  	"sent" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_section_id_sections_id_fk" FOREIGN KEY ("version_section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections_texts" ADD CONSTRAINT "sections_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_texts" ADD CONSTRAINT "tags_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "issues_contents" ADD CONSTRAINT "issues_contents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "issues" ADD CONSTRAINT "issues_pdf_id_media_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_issues_v_version_contents" ADD CONSTRAINT "_issues_v_version_contents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_issues_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_issues_v" ADD CONSTRAINT "_issues_v_parent_id_issues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_issues_v" ADD CONSTRAINT "_issues_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_issues_v" ADD CONSTRAINT "_issues_v_version_pdf_id_media_id_fk" FOREIGN KEY ("version_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_story_id_posts_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_social" ADD CONSTRAINT "users_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_last_notified_issue_id_issues_id_fk" FOREIGN KEY ("last_notified_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "excos" ADD CONSTRAINT "excos_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ambassadors" ADD CONSTRAINT "ambassadors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_last_notified_issue_id_issues_id_fk" FOREIGN KEY ("last_notified_issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_issues_fk" FOREIGN KEY ("issues_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_celebrations_fk" FOREIGN KEY ("celebrations_id") REFERENCES "public"."celebrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_excos_fk" FOREIGN KEY ("excos_id") REFERENCES "public"."excos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ambassadors_fk" FOREIGN KEY ("ambassadors_id") REFERENCES "public"."ambassadors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_views_fk" FOREIGN KEY ("daily_views_id") REFERENCES "public"."daily_views"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_audience" ADD CONSTRAINT "site_settings_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_ad_options" ADD CONSTRAINT "site_settings_ad_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_ads" ADD CONSTRAINT "site_settings_ads_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_ads" ADD CONSTRAINT "site_settings_ads_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_ads" ADD CONSTRAINT "site_settings_ads_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_phones" ADD CONSTRAINT "site_settings_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social" ADD CONSTRAINT "site_settings_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_media_kit_id_media_id_fk" FOREIGN KEY ("media_kit_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_texts" ADD CONSTRAINT "site_settings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_section_idx" ON "posts" USING btree ("section_id");
  CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");
  CREATE INDEX "posts_legacy_path_idx" ON "posts" USING btree ("legacy_path");
  CREATE INDEX "posts_wp_id_idx" ON "posts" USING btree ("wp_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_tags_id_idx" ON "posts_rels" USING btree ("tags_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_section_idx" ON "_posts_v" USING btree ("version_section_id");
  CREATE INDEX "_posts_v_version_version_author_idx" ON "_posts_v" USING btree ("version_author_id");
  CREATE INDEX "_posts_v_version_version_legacy_path_idx" ON "_posts_v" USING btree ("version_legacy_path");
  CREATE INDEX "_posts_v_version_version_wp_id_idx" ON "_posts_v" USING btree ("version_wp_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_tags_id_idx" ON "_posts_v_rels" USING btree ("tags_id");
  CREATE UNIQUE INDEX "sections_slug_idx" ON "sections" USING btree ("slug");
  CREATE INDEX "sections_updated_at_idx" ON "sections" USING btree ("updated_at");
  CREATE INDEX "sections_created_at_idx" ON "sections" USING btree ("created_at");
  CREATE INDEX "sections_texts_order_parent" ON "sections_texts" USING btree ("order","parent_id");
  CREATE INDEX "tags_section_idx" ON "tags" USING btree ("section_id");
  CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "section_slug_idx" ON "tags" USING btree ("section_id","slug");
  CREATE INDEX "tags_texts_order_parent" ON "tags_texts" USING btree ("order","parent_id");
  CREATE INDEX "issues_contents_order_idx" ON "issues_contents" USING btree ("_order");
  CREATE INDEX "issues_contents_parent_id_idx" ON "issues_contents" USING btree ("_parent_id");
  CREATE INDEX "issues_cover_idx" ON "issues" USING btree ("cover_id");
  CREATE INDEX "issues_pdf_idx" ON "issues" USING btree ("pdf_id");
  CREATE UNIQUE INDEX "issues_slug_idx" ON "issues" USING btree ("slug");
  CREATE INDEX "issues_release_date_idx" ON "issues" USING btree ("release_date");
  CREATE INDEX "issues_legacy_path_idx" ON "issues" USING btree ("legacy_path");
  CREATE INDEX "issues_updated_at_idx" ON "issues" USING btree ("updated_at");
  CREATE INDEX "issues_created_at_idx" ON "issues" USING btree ("created_at");
  CREATE INDEX "issues__status_idx" ON "issues" USING btree ("_status");
  CREATE INDEX "_issues_v_version_contents_order_idx" ON "_issues_v_version_contents" USING btree ("_order");
  CREATE INDEX "_issues_v_version_contents_parent_id_idx" ON "_issues_v_version_contents" USING btree ("_parent_id");
  CREATE INDEX "_issues_v_parent_idx" ON "_issues_v" USING btree ("parent_id");
  CREATE INDEX "_issues_v_version_version_cover_idx" ON "_issues_v" USING btree ("version_cover_id");
  CREATE INDEX "_issues_v_version_version_pdf_idx" ON "_issues_v" USING btree ("version_pdf_id");
  CREATE INDEX "_issues_v_version_version_slug_idx" ON "_issues_v" USING btree ("version_slug");
  CREATE INDEX "_issues_v_version_version_release_date_idx" ON "_issues_v" USING btree ("version_release_date");
  CREATE INDEX "_issues_v_version_version_legacy_path_idx" ON "_issues_v" USING btree ("version_legacy_path");
  CREATE INDEX "_issues_v_version_version_updated_at_idx" ON "_issues_v" USING btree ("version_updated_at");
  CREATE INDEX "_issues_v_version_version_created_at_idx" ON "_issues_v" USING btree ("version_created_at");
  CREATE INDEX "_issues_v_version_version__status_idx" ON "_issues_v" USING btree ("version__status");
  CREATE INDEX "_issues_v_created_at_idx" ON "_issues_v" USING btree ("created_at");
  CREATE INDEX "_issues_v_updated_at_idx" ON "_issues_v" USING btree ("updated_at");
  CREATE INDEX "_issues_v_latest_idx" ON "_issues_v" USING btree ("latest");
  CREATE INDEX "media_source_url_idx" ON "media" USING btree ("source_url");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_cover_sizes_cover_filename_idx" ON "media" USING btree ("sizes_cover_filename");
  CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");
  CREATE INDEX "comments_member_idx" ON "comments" USING btree ("member_id");
  CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");
  CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");
  CREATE INDEX "comments_report_count_idx" ON "comments" USING btree ("report_count");
  CREATE INDEX "comments_wp_comment_id_idx" ON "comments" USING btree ("wp_comment_id");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "comments_rels_order_idx" ON "comments_rels" USING btree ("order");
  CREATE INDEX "comments_rels_parent_idx" ON "comments_rels" USING btree ("parent_id");
  CREATE INDEX "comments_rels_path_idx" ON "comments_rels" USING btree ("path");
  CREATE INDEX "comments_rels_members_id_idx" ON "comments_rels" USING btree ("members_id");
  CREATE INDEX "celebrations_status_idx" ON "celebrations" USING btree ("status");
  CREATE INDEX "celebrations_member_idx" ON "celebrations" USING btree ("member_id");
  CREATE INDEX "celebrations_photo_idx" ON "celebrations" USING btree ("photo_id");
  CREATE INDEX "celebrations_story_idx" ON "celebrations" USING btree ("story_id");
  CREATE INDEX "celebrations_updated_at_idx" ON "celebrations" USING btree ("updated_at");
  CREATE INDEX "celebrations_created_at_idx" ON "celebrations" USING btree ("created_at");
  CREATE INDEX "users_social_order_idx" ON "users_social" USING btree ("_order");
  CREATE INDEX "users_social_parent_id_idx" ON "users_social" USING btree ("_parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_slug_idx" ON "users" USING btree ("slug");
  CREATE INDEX "users_photo_idx" ON "users" USING btree ("photo_id");
  CREATE INDEX "users_wp_author_id_idx" ON "users" USING btree ("wp_author_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "members_username_idx" ON "members" USING btree ("username");
  CREATE INDEX "members_photo_idx" ON "members" USING btree ("photo_id");
  CREATE INDEX "members_last_digest_at_idx" ON "members" USING btree ("last_digest_at");
  CREATE INDEX "members_last_notified_issue_idx" ON "members" USING btree ("last_notified_issue_id");
  CREATE INDEX "members_invited_at_idx" ON "members" USING btree ("invited_at");
  CREATE INDEX "members_wp_user_id_idx" ON "members" USING btree ("wp_user_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  CREATE INDEX "members_rels_order_idx" ON "members_rels" USING btree ("order");
  CREATE INDEX "members_rels_parent_idx" ON "members_rels" USING btree ("parent_id");
  CREATE INDEX "members_rels_path_idx" ON "members_rels" USING btree ("path");
  CREATE INDEX "members_rels_posts_id_idx" ON "members_rels" USING btree ("posts_id");
  CREATE INDEX "excos_session_idx" ON "excos" USING btree ("session");
  CREATE INDEX "excos_photo_idx" ON "excos" USING btree ("photo_id");
  CREATE INDEX "excos_updated_at_idx" ON "excos" USING btree ("updated_at");
  CREATE INDEX "excos_created_at_idx" ON "excos" USING btree ("created_at");
  CREATE INDEX "ambassadors_photo_idx" ON "ambassadors" USING btree ("photo_id");
  CREATE INDEX "ambassadors_updated_at_idx" ON "ambassadors" USING btree ("updated_at");
  CREATE INDEX "ambassadors_created_at_idx" ON "ambassadors" USING btree ("created_at");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
  CREATE INDEX "subscribers_last_digest_at_idx" ON "subscribers" USING btree ("last_digest_at");
  CREATE INDEX "subscribers_last_notified_issue_idx" ON "subscribers" USING btree ("last_notified_issue_id");
  CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");
  CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
  CREATE INDEX "daily_views_kind_idx" ON "daily_views" USING btree ("kind");
  CREATE INDEX "daily_views_doc_id_idx" ON "daily_views" USING btree ("doc_id");
  CREATE INDEX "daily_views_day_idx" ON "daily_views" USING btree ("day");
  CREATE INDEX "daily_views_updated_at_idx" ON "daily_views" USING btree ("updated_at");
  CREATE INDEX "daily_views_created_at_idx" ON "daily_views" USING btree ("created_at");
  CREATE UNIQUE INDEX "kind_docId_day_idx" ON "daily_views" USING btree ("kind","doc_id","day");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_sections_id_idx" ON "payload_locked_documents_rels" USING btree ("sections_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("issues_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_celebrations_id_idx" ON "payload_locked_documents_rels" USING btree ("celebrations_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_excos_id_idx" ON "payload_locked_documents_rels" USING btree ("excos_id");
  CREATE INDEX "payload_locked_documents_rels_ambassadors_id_idx" ON "payload_locked_documents_rels" USING btree ("ambassadors_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_daily_views_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_views_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_audience_order_idx" ON "site_settings_audience" USING btree ("_order");
  CREATE INDEX "site_settings_audience_parent_id_idx" ON "site_settings_audience" USING btree ("_parent_id");
  CREATE INDEX "site_settings_ad_options_order_idx" ON "site_settings_ad_options" USING btree ("_order");
  CREATE INDEX "site_settings_ad_options_parent_id_idx" ON "site_settings_ad_options" USING btree ("_parent_id");
  CREATE INDEX "site_settings_ads_order_idx" ON "site_settings_ads" USING btree ("_order");
  CREATE INDEX "site_settings_ads_parent_id_idx" ON "site_settings_ads" USING btree ("_parent_id");
  CREATE INDEX "site_settings_ads_image_idx" ON "site_settings_ads" USING btree ("image_id");
  CREATE INDEX "site_settings_ads_mobile_image_idx" ON "site_settings_ads" USING btree ("mobile_image_id");
  CREATE INDEX "site_settings_phones_order_idx" ON "site_settings_phones" USING btree ("_order");
  CREATE INDEX "site_settings_phones_parent_id_idx" ON "site_settings_phones" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_order_idx" ON "site_settings_social" USING btree ("_order");
  CREATE INDEX "site_settings_social_parent_id_idx" ON "site_settings_social" USING btree ("_parent_id");
  CREATE INDEX "site_settings_media_kit_idx" ON "site_settings" USING btree ("media_kit_id");
  CREATE INDEX "site_settings_texts_order_parent" ON "site_settings_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "sections" CASCADE;
  DROP TABLE "sections_texts" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_texts" CASCADE;
  DROP TABLE "issues_contents" CASCADE;
  DROP TABLE "issues" CASCADE;
  DROP TABLE "_issues_v_version_contents" CASCADE;
  DROP TABLE "_issues_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "comments_rels" CASCADE;
  DROP TABLE "celebrations" CASCADE;
  DROP TABLE "users_social" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "members_rels" CASCADE;
  DROP TABLE "excos" CASCADE;
  DROP TABLE "ambassadors" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "subscribers" CASCADE;
  DROP TABLE "daily_views" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_audience" CASCADE;
  DROP TABLE "site_settings_ad_options" CASCADE;
  DROP TABLE "site_settings_ads" CASCADE;
  DROP TABLE "site_settings_phones" CASCADE;
  DROP TABLE "site_settings_social" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_texts" CASCADE;
  DROP TABLE "tv_cache" CASCADE;
  DROP TABLE "email_usage" CASCADE;
  DROP TYPE "public"."enum_posts_story_type";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_story_type";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_issues_status";
  DROP TYPE "public"."enum__issues_v_version_status";
  DROP TYPE "public"."enum_comments_status";
  DROP TYPE "public"."enum_celebrations_status";
  DROP TYPE "public"."enum_celebrations_kind";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_members_member_type";
  DROP TYPE "public"."enum_members_alerts";
  DROP TYPE "public"."enum_enquiries_status";
  DROP TYPE "public"."enum_enquiries_type";
  DROP TYPE "public"."enum_site_settings_ads_placement";`)
}
