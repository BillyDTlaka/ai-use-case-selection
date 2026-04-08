import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeUseCase(clientProfile, useCase) {
  const prompt = `You are an AI enterprise architect and strategy advisor.

Client architecture:
- Name: ${clientProfile.name}
- Core Systems: ${clientProfile.systems.join(', ')}
- Integration Layer: ${clientProfile.integrations.join(', ')}
- Data Platforms: ${clientProfile.dataPlatforms.join(', ')}
- Channels: ${clientProfile.channels.join(', ')}
- Cloud Environment: ${clientProfile.cloudEnv}
- Data Quality: ${clientProfile.dataQuality}
- Constraints: ${clientProfile.constraints.join(', ')}

Use case:
- Title: ${useCase.title}
- Description: ${useCase.description}
- Business Objective: ${useCase.businessObjective}
- Business Unit: ${useCase.businessUnit}
- Domain: ${useCase.domain}

Assess realistically based on integration complexity, data availability, and legacy constraints.

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{
  "summary": "max 3 lines",
  "businessProblem": "the core business problem being solved",
  "category": "one of: Fraud, Claims, CX, Operations, Underwriting, Finance, HR, Other",
  "scores": {
    "value": 1-5,
    "feasibility": 1-5,
    "data": 1-5,
    "speed": 1-5,
    "risk": 1-5
  },
  "recommendation": "QUICK_WIN or STRATEGIC or AVOID",
  "reasoning": "2-3 sentences explaining the assessment"
}

Score guidance:
- value: 1=low business impact, 5=transformational
- feasibility: 1=very complex/blocked, 5=straightforward with existing stack
- data: 1=data unavailable/poor quality, 5=data ready and high quality
- speed: 1=18+ months, 5=under 3 months
- risk: 1=low risk, 5=high risk (this PENALISES the score, so be honest)`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].text.trim()
  return JSON.parse(text)
}
