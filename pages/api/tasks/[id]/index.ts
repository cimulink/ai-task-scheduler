import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  estimatedHours: z.number().min(0.1, 'Hours must be positive').max(500, 'Hours too large').optional(),
  priority: z.number().min(1, 'Priority must be at least 1').max(100, 'Priority cannot exceed 100').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  assignedTo: z.string().nullable().optional()
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetTask(req, res)
  } else if (req.method === 'PUT') {
    return handleUpdateTask(req, res)
  } else if (req.method === 'DELETE') {
    return handleDeleteTask(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleGetTask(req: NextApiRequest, res: NextApiResponse) {
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

    const task = await prisma.task.findFirst({
      where: {
        id: id,
        project: {
          userId: user.id
        }
      },
      include: {
        project: true,
        assignee: true
      }
    })

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.status(200).json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse) {
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

    console.log(`[API] Updating task: ${id}`)
    console.log(`[API] Update data:`, req.body)

    // Validate the update data
    const validatedData = updateTaskSchema.parse(req.body)

    // Verify task ownership
    const existingTask = await prisma.task.findFirst({
      where: {
        id: id,
        project: {
          userId: user.id
        }
      }
    })

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // If assignedTo is provided, verify the resource exists and belongs to user
    if (validatedData.assignedTo) {
      const resource = await prisma.resource.findFirst({
        where: {
          id: validatedData.assignedTo,
          userId: user.id
        }
      })

      if (!resource) {
        return res.status(400).json({ message: 'Invalid resource assignment' })
      }
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: validatedData,
      include: {
        assignee: true
      }
    })

    console.log(`[API] Task updated successfully: ${updatedTask.title}`)

    res.status(200).json(updatedTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('[API] Error updating task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse) {
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

    // Verify task ownership and delete
    const deletedTask = await prisma.task.deleteMany({
      where: {
        id: id,
        project: {
          userId: user.id
        }
      }
    })

    if (deletedTask.count === 0) {
      return res.status(404).json({ message: 'Task not found' })
    }

    console.log(`[API] Task deleted successfully: ${id}`)

    res.status(200).json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('[API] Error deleting task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}