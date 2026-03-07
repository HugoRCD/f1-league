CREATE TABLE "userPreferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"notificationsEnabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "userPreferences" ADD CONSTRAINT "userPreferences_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;