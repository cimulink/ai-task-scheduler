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
      return res.status(400).json({ message: 'Invalid project ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    console.log(`[API] Starting resource assignment for project: ${id}`)

    // Get project with tasks
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        tasks: {
          where: {
            assignedTo: null // Only get unassigned tasks
          },
          orderBy: { priority: 'desc' }
        }
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (project.tasks.length === 0) {
      return res.status(400).json({ message: 'No unassigned tasks to assign' })
    }

    // Get available resources
    const resources = await prisma.resource.findMany({
      where: { userId: user.id }
    })

    if (resources.length === 0) {
      return res.status(400).json({ message: 'No resources available for assignment' })
    }

    console.log(`[API] Found ${project.tasks.length} unassigned tasks and ${resources.length} resources`)

    // Use AI service for assignment
    const aiService = getAIService()
    const startTime = Date.now()

    console.log('[API] Calling AI service for resource assignment...')
    const assignments = await aiService.assignTasks(project.tasks, resources)

    const duration = Date.now() - startTime
    console.log(`[API] AI assignment completed in ${duration}ms`)
    console.log(`[API] Generated ${assignments.length} assignments`)

    // Apply assignments to database
    console.log('[API] Applying assignments to database...')
    const updatePromises = assignments.map((assignment, index) => {
      console.log(`[API] Assigning task ${assignment.taskId} to resource ${assignment.resourceId}: ${assignment.reason}`)
      return prisma.task.update({
        where: { id: assignment.taskId },
        data: { assignedTo: assignment.resourceId }
      })
    })

    const updatedTasks = await Promise.all(updatePromises)

    console.log('[API] Resource assignment completed successfully')

    res.status(200).json({
      message: 'Resources assigned successfully',
      assignments: assignments,
      updatedTasks: updatedTasks
    })

  } catch (error) {
    console.error('[API] Error during resource assignment:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}