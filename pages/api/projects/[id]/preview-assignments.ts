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

    console.log(`[API] Generating assignment preview for project: ${id}`)

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
      return res.status(400).json({ message: 'No unassigned tasks to preview' })
    }

    // Get available resources with current workload
    const resources = await prisma.resource.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          where: {
            status: {
              in: ['pending', 'in_progress']
            }
          },
          select: {
            estimatedHours: true
          }
        }
      }
    })

    if (resources.length === 0) {
      return res.status(400).json({ message: 'No resources available for assignment preview' })
    }

    console.log(`[API] Generating preview for ${project.tasks.length} tasks with ${resources.length} resources`)

    // Calculate current workload for each resource
    const resourcesWithWorkload = resources.map(resource => ({
      ...resource,
      currentlyAssignedHours: resource.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)
    }))

    // Use AI service for assignment preview
    const aiService = getAIService()
    const startTime = Date.now()

    console.log('[API] Calling AI service for assignment preview...')
    const preview = await aiService.assignTasks(project.tasks, resourcesWithWorkload)

    const duration = Date.now() - startTime
    console.log(`[API] Assignment preview generated in ${duration}ms`)
    console.log(`[API] Preview: ${preview.summary.immediateAssignments} immediate, ${preview.summary.deferredAssignments} deferred, ${preview.summary.overflowTasks} overflow`)

    res.status(200).json({
      message: 'Assignment preview generated successfully',
      preview: preview
    })

  } catch (error) {
    console.error('[API] Error during assignment preview:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}