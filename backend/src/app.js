import Fastify from 'fastify'
import cors from '@fastify/cors'
import { clientProfileRoutes } from './routes/clientProfile.js'
import { useCaseRoutes } from './routes/useCase.js'
import { analyzeRoutes } from './routes/analyze.js'
import { workflowRoutes } from './routes/workflow.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })

  app.register(clientProfileRoutes)
  app.register(useCaseRoutes)
  app.register(analyzeRoutes)
  app.register(workflowRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
