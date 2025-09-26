import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const taskModificationSchema = z.object({
  taskId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  estimatedHours: z.number().optional(),
  priority: z.number().min(1).max(100).optional(),
  reasoning: z.string()
})

const newTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  estimatedHours: z.number().positive(),
  priority: z.number().min(1).max(100)
})

const applySchema = z.object({
  updateDescription: z.string().min(1).max(2000),
  taskModifications: z.array(taskModificationSchema),
  newTasks: z.array(newTaskSchema)
})

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

    // Validate request body
    const validatedData = applySchema.parse(req.body)

    console.log('[Apply API] Received request with:')
    console.log('- Task modifications:', validatedData.taskModifications.length)
    console.log('- New tasks:', validatedData.newTasks.length)
    if (validatedData.newTasks.length > 0) {
      console.log('- New task titles:', validatedData.newTasks.map(t => t.title))
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Apply all changes in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTaskIds: string[] = []
      const createdTaskIds: string[] = []

      // Update existing tasks
      for (const modification of validatedData.taskModifications) {
        const updateData: any = {}

        if (modification.title !== undefined) {
          updateData.title = modification.title
        }
        if (modification.description !== undefined) {
          updateData.description = modification.description
        }
        if (modification.estimatedHours !== undefined) {
          updateData.estimatedHours = modification.estimatedHours
        }
        if (modification.priority !== undefined) {
          updateData.priority = modification.priority
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date()

          await tx.task.update({
            where: { id: modification.taskId },
            data: updateData
          })

          updatedTaskIds.push(modification.taskId)
        }
      }

      // Create new tasks
      for (const newTask of validatedData.newTasks) {
        console.log(`[Apply API] Creating new task: "${newTask.title}"`)
        const createdTask = await tx.task.create({
          data: {
            projectId: id,
            title: newTask.title,
            description: newTask.description,
            estimatedHours: newTask.estimatedHours,
            priority: newTask.priority,
            status: 'pending'
          }
        })

        console.log(`[Apply API] Created task with ID: ${createdTask.id}`)
        createdTaskIds.push(createdTask.id)
      }

      // Record the update
      const projectUpdate = await tx.projectUpdate.create({
        data: {
          projectId: id,
          userId: user.id,
          updateDescription: validatedData.updateDescription,
          affectedTasks: updatedTaskIds,
          createdTasks: createdTaskIds
        }
      })

      console.log(`[Apply API] Transaction completed successfully:`)
      console.log(`- Updated ${updatedTaskIds.length} existing tasks`)
      console.log(`- Created ${createdTaskIds.length} new tasks`)

      return {
        projectUpdate,
        updatedTasksCount: updatedTaskIds.length,
        createdTasksCount: createdTaskIds.length
      }
    })

    res.status(200).json({
      message: 'Update applied successfully',
      updatedTasks: result.updatedTasksCount,
      createdTasks: result.createdTasksCount,
      updateId: result.projectUpdate.id
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Error applying update:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}