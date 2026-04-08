import { prisma } from '../lib/prisma.js'

export async function clientProfileRoutes(fastify) {
  fastify.get('/client-profile', async () => {
    const profiles = await prisma.clientProfile.findMany({ orderBy: { createdAt: 'desc' } })
    return profiles
  })

  fastify.post('/client-profile', async (req, reply) => {
    const profile = await prisma.clientProfile.create({ data: req.body })
    return reply.code(201).send(profile)
  })

  fastify.put('/client-profile/:id', async (req, reply) => {
    const profile = await prisma.clientProfile.update({
      where: { id: req.params.id },
      data: req.body,
    })
    return profile
  })
}
