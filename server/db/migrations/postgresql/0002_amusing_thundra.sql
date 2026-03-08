CREATE TABLE "league" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"inviteCode" text NOT NULL,
	"season" integer DEFAULT 2026 NOT NULL,
	"scoringConfig" jsonb,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_slug_unique" UNIQUE("slug"),
	CONSTRAINT "league_inviteCode_unique" UNIQUE("inviteCode")
);
--> statement-breakpoint
CREATE TABLE "leagueMember" (
	"id" text PRIMARY KEY NOT NULL,
	"leagueId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leagueMember_leagueId_userId_unique" UNIQUE("leagueId","userId")
);
--> statement-breakpoint
ALTER TABLE "prediction" DROP CONSTRAINT "prediction_userId_raceId_unique";--> statement-breakpoint
ALTER TABLE "prediction" ADD COLUMN "leagueId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "league" ADD CONSTRAINT "league_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagueMember" ADD CONSTRAINT "leagueMember_leagueId_league_id_fk" FOREIGN KEY ("leagueId") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagueMember" ADD CONSTRAINT "leagueMember_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_createdBy_idx" ON "league" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "league_season_idx" ON "league" USING btree ("season");--> statement-breakpoint
CREATE INDEX "leagueMember_leagueId_idx" ON "leagueMember" USING btree ("leagueId");--> statement-breakpoint
CREATE INDEX "leagueMember_userId_idx" ON "leagueMember" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_leagueId_league_id_fk" FOREIGN KEY ("leagueId") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prediction_leagueId_idx" ON "prediction" USING btree ("leagueId");--> statement-breakpoint
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_userId_raceId_leagueId_unique" UNIQUE("userId","raceId","leagueId");