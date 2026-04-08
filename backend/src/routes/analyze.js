import { prisma } from '../lib/prisma.js'
import { analyzeUseCase } from '../lib/claude.js'
import { applyScoring } from '../lib/scoring.js'

export async function analyzeRoutes(fastify) {
  fastify.post('/analyze', async (req, reply) => {
    const { useCaseId } = req.body

    const useCase = await prisma.useCase.findUnique({
      where: { id: useCaseId },
      include: { clientProfile: true },
    })
    if (!useCase) return reply.code(404).send({ error: 'Use case not found' })
    if (!useCase.clientProfile) return reply.code(400).send({ error: 'No client profile linked' })

    const result = await analyzeUseCase(useCase.clientProfile, useCase)

    const { totalScore, recommendation } = applyScoring({
      value: result.scores.value,
      feasibility: result.scores.feasibility,
      data: result.scores.data,
      speed: result.scores.speed,
      risk: result.scores.risk,
    })

    const updated = await prisma.useCase.update({
      where: { id: useCaseId },
      data: {
        aiSummary: result.summary,
        businessProblem: result.businessProblem,
        category: result.category,
        reasoning: result.reasoning,
        aiScoreValue: result.scores.value,
        aiScoreFeasibility: result.scores.feasibility,
        aiScoreData: result.scores.data,
        aiScoreSpeed: result.scores.speed,
        aiScoreRisk: result.scores.risk,
        scoreValue: result.scores.value,
        scoreFeasibility: result.scores.feasibility,
        scoreData: result.scores.data,
        scoreSpeed: result.scores.speed,
        scoreRisk: result.scores.risk,
        totalScore,
        recommendation,
      },
      include: { comments: true },
    })

    return updated
  })
}
