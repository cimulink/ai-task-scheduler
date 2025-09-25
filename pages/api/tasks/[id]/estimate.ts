import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAIService } from '@/lib/ai/aiService'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid task ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: id,
        project: {
          userId: user.id
        }
      },
      include: {
        project: true
      }
    })

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Generate estimate using AI service
    console.log(`[API] Starting task estimation for task: ${task.id}`)
    console.log(`[API] Task: "${task.title}"`)
    console.log(`[API] Task description length: ${(task.description || '').length} characters`)

    const aiService = getAIService()
    const startTime = Date.now()

    console.log('[API] Calling AI service for task estimation...')
    const estimation = await aiService.estimateTask(task.description || task.title)

    const duration = Date.now() - startTime
    console.log(`[API] AI estimation completed in ${duration}ms`)
    console.log(`[API] Estimated hours: ${estimation.estimatedHours}, confidence: ${estimation.confidence}`)

    // Update task with new estimation
    console.log('[API] Updating task with new estimation...')
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        estimatedHours: estimation.estimatedHours
      }
    })

    console.log('[API] Task estimation process completed successfully')

    res.status(200).json({
      task: updatedTask,
      estimation: {
        estimatedHours: estimation.estimatedHours,
        confidence: estimation.confidence
      }
    })

  } catch (error) {
    console.error('[API] Error during task estimation:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}