import { prisma } from '../lib/prisma.js'

export async function useCaseRoutes(fastify) {
  fastify.get('/use-cases', async (req) => {
    const { businessUnit, domain, workspace, status, recommendation } = req.query
    const where = {}
    if (businessUnit) where.businessUnit = businessUnit
    if (domain) where.domain = domain
    if (workspace) where.workspace = workspace
    if (status) where.status = status
    if (recommendation) where.recommendation = recommendation

    return prisma.useCase.findMany({
      where,
      include: { comments: { orderBy: { createdAt: 'desc' } } },
      orderBy: { totalScore: 'desc' },
    })
  })

  fastify.get('/use-cases/:id', async (req, reply) => {
    const useCase = await prisma.useCase.findUnique({
      where: { id: req.params.id },
      include: { comments: { orderBy: { createdAt: 'asc' } }, clientProfile: true },
    })
    if (!useCase) return reply.code(404).send({ error: 'Not found' })
    return useCase
  })

  fastify.post('/use-case', async (req, reply) => {
    const useCase = await prisma.useCase.create({ data: req.body })
    return reply.code(201).send(useCase)
  })

  fastify.put('/use-case/:id', async (req) => {
    return prisma.useCase.update({ where: { id: req.params.id }, data: req.body })
  })
}
