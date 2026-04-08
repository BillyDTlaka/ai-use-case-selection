-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systems" TEXT[],
    "integrations" TEXT[],
    "dataPlatforms" TEXT[],
    "channels" TEXT[],
    "cloudEnv" TEXT NOT NULL,
    "dataQuality" TEXT NOT NULL,
    "constraints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "businessUnit" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "workspace" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "category" TEXT,
    "scoreValue" INTEGER,
    "scoreFeasibility" INTEGER,
    "scoreData" INTEGER,
    "scoreSpeed" INTEGER,
    "scoreRisk" INTEGER,
    "totalScore" DOUBLE PRECISION,
    "recommendation" TEXT,
    "aiScoreValue" INTEGER,
    "aiScoreFeasibility" INTEGER,
    "aiScoreData" INTEGER,
    "aiScoreSpeed" INTEGER,
    "aiScoreRisk" INTEGER,
    "aiSummary" TEXT,
    "businessProblem" TEXT,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "clientProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "UseCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
