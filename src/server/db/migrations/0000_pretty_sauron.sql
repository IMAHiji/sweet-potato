CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"traditional" text NOT NULL,
	"simplified" text NOT NULL,
	"pinyin" text NOT NULL,
	"zhuyin" text NOT NULL,
	"definition" text NOT NULL,
	"hsk_level" integer,
	"frequency_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_traditional_unique" UNIQUE("traditional")
);
--> statement-breakpoint
CREATE TABLE "example_sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"character_id" integer NOT NULL,
	"traditional" text NOT NULL,
	"simplified" text NOT NULL,
	"pinyin" text,
	"zhuyin" text,
	"translation" text NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"character_id" integer NOT NULL,
	"rating" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "example_sentences" ADD CONSTRAINT "example_sentences_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_hsk_level_idx" ON "characters" USING btree ("hsk_level");--> statement-breakpoint
CREATE INDEX "characters_simplified_idx" ON "characters" USING btree ("simplified");--> statement-breakpoint
CREATE INDEX "example_sentences_character_id_idx" ON "example_sentences" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "reviews_user_character_idx" ON "reviews" USING btree ("user_id","character_id");