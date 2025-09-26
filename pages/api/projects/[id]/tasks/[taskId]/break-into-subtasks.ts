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

    const { id: projectId, taskId } = req.query
    if (typeof projectId !== 'string' || typeof taskId !== 'string') {
      return res.status(400).json({ message: 'Invalid project or task ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Get the parent task
    const parentTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId
      }
    })

    if (!parentTask) {
      return res.status(404).json({ message: 'Task not found' })
    }

    console.log(`[API] Breaking task into subtasks: ${taskId}`)

    // Use AI service to break down the task
    const aiService = getAIService()
    const taskDescription = `${parentTask.title}: ${parentTask.description || ''}`

    const generatedSubtasks = await aiService.generateTasks(
      `Break down this task into 3-5 smaller, actionable subtasks: "${taskDescription}".
      Each subtask should be specific and achievable. Keep the scope smaller than the original task.
      Priority should be inherited from parent (${parentTask.priority}).
      Estimated hours should sum up to approximately ${parentTask.estimatedHours || 4} hours total.`
    )

    console.log(`[API] Generated ${generatedSubtasks.length} subtasks`)

    // Create subtasks in database
    const createdSubtasks = await Promise.all(
      generatedSubtasks.map((subtask, index) =>
        prisma.task.create({
          data: {
            title: subtask.title,
            description: subtask.description,
            estimatedHours: subtask.estimatedHours,
            priority: subtask.priority,
            status: 'pending',
            projectId: projectId,
            parentTaskId: taskId,
            assignedTo: null
          },
          include: {
            assignee: true,
            subtasks: {
              include: {
                assignee: true
              }
            }
          }
        })
      )
    )

    console.log(`[API] Created ${createdSubtasks.length} subtasks successfully`)

    res.status(201).json({
      message: 'Task broken into subtasks successfully',
      subtasks: createdSubtasks,
      parentTask: parentTask
    })

  } catch (error) {
    console.error('[API] Error breaking task into subtasks:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}