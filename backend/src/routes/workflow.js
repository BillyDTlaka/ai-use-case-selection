import { prisma } from '../lib/prisma.js'
import { applyScoring } from '../lib/scoring.js'

export async function workflowRoutes(fastify) {
  fastify.post('/use-case/submit', async (req, reply) => {
    const { id, submittedBy } = req.body
    const useCase = await prisma.useCase.findUnique({ where: { id } })
    if (!useCase) return reply.code(404).send({ error: 'Not found' })
    if (useCase.status !== 'DRAFT') return reply.code(400).send({ error: 'Only DRAFT can be submitted' })
    return prisma.useCase.update({ where: { id }, data: { status: 'IN_REVIEW' } })
  })

  fastify.post('/use-case/review', async (req, reply) => {
    const { id, reviewedBy, scores } = req.body
    const useCase = await prisma.useCase.findUnique({ where: { id } })
    if (!useCase) return reply.code(404).send({ error: 'Not found' })
    if (useCase.status !== 'IN_REVIEW') return reply.code(400).send({ error: 'Only IN_REVIEW can be reviewed' })

    let scoreUpdate = {}
    if (scores) {
      const { totalScore, recommendation } = applyScoring(scores)
      scoreUpdate = {
        scoreValue: scores.value,
        scoreFeasibility: scores.feasibility,
        scoreData: scores.data,
        scoreSpeed: scores.speed,
        scoreRisk: scores.risk,
        totalScore,
        recommendation,
      }
    }

    return prisma.useCase.update({
      where: { id },
      data: { reviewedBy, reviewedAt: new Date(), ...scoreUpdate },
    })
  })

  fastify.post('/use-case/approve', async (req, reply) => {
    const { id, approvedBy } = req.body
    const useCase = await prisma.useCase.findUnique({ where: { id } })
    if (!useCase) return reply.code(404).send({ error: 'Not found' })
    if (useCase.status !== 'IN_REVIEW') return reply.code(400).send({ error: 'Only IN_REVIEW can be approved' })
    return prisma.useCase.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    })
  })

  fastify.post('/use-case/reject', async (req, reply) => {
    const { id, approvedBy } = req.body
    const useCase = await prisma.useCase.findUnique({ where: { id } })
    if (!useCase) return reply.code(404).send({ error: 'Not found' })
    if (useCase.status !== 'IN_REVIEW') return reply.code(400).send({ error: 'Only IN_REVIEW can be rejected' })
    return prisma.useCase.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy, approvedAt: new Date() },
    })
  })

  fastify.post('/use-case/comment', async (req, reply) => {
    const { useCaseId, content, author, role } = req.body
    const comment = await prisma.comment.create({ data: { useCaseId, content, author, role } })
    return reply.code(201).send(comment)
  })
}
